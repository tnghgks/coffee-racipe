"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useFormContext, type FieldArrayWithId } from "react-hook-form";

import { inputClass } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { formatSeconds, parseClock } from "@/lib/brew";
import { cn } from "@/lib/utils";

import { MAX_STEPS, type RecipeFormInput } from "../../editor-schema";

export function StepListEditor() {
  const { control, getValues } = useFormContext<RecipeFormInput>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "steps" });
  // dnd-kit derives aria ids from a global counter unless given one; a stable id avoids hydration mismatches.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      fields.findIndex((f) => f.id === active.id),
      fields.findIndex((f) => f.id === over.id),
    );
  };

  const addStep = () => {
    const last = getValues("steps").at(-1);
    const lastStart = last ? (parseClock(last.startAt) ?? 0) : -30;
    append({
      label: `${fields.length}차 붓기`,
      startAt: formatSeconds(lastStart + 30),
      cumulativeG: last && Number.isFinite(last.cumulativeG) ? last.cumulativeG : 0,
      note: "",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2" aria-label="단계 목록">
            {fields.map((field, index) => (
              <StepRow
                key={field.id}
                field={field}
                index={index}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" className="h-11" onClick={addStep} disabled={fields.length >= MAX_STEPS}>
        <Plus aria-hidden />
        단계 추가
      </Button>
    </div>
  );
}

function StepRow({
  field,
  index,
  canRemove,
  onRemove,
}: {
  field: FieldArrayWithId<RecipeFormInput, "steps">;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeFormInput>();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const stepErrors = errors.steps?.[index];
  const messages = [stepErrors?.label, stepErrors?.startAt, stepErrors?.cumulativeG, stepErrors?.note]
    .map((e) => e?.message)
    .filter(Boolean);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-xl border bg-card p-2", isDragging && "relative z-10 shadow-lg")}
      data-testid="step-row"
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${index + 1}번째 단계 순서 바꾸기`}
          className="flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        {/* Phones: name on its own line, then time + grams. sm+: one row. */}
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_5rem]">
          <input
            aria-label={`${index + 1}번째 단계 이름`}
            aria-invalid={!!stepErrors?.label}
            className={cn(inputClass, "col-span-2 sm:col-span-1")}
            {...register(`steps.${index}.label`)}
          />
          <input
            aria-label={`${index + 1}번째 단계 시작 시각`}
            aria-invalid={!!stepErrors?.startAt}
            inputMode="numeric"
            placeholder="0:00"
            className={cn(inputClass, "px-2 text-center tabular-nums")}
            {...register(`steps.${index}.startAt`)}
          />
          <div className="relative">
            <input
              aria-label={`${index + 1}번째 단계 누적 물량(g)`}
              aria-invalid={!!stepErrors?.cumulativeG}
              type="number"
              inputMode="numeric"
              min={0}
              className={cn(inputClass, "pr-6 pl-2 text-right tabular-nums")}
              {...register(`steps.${index}.cumulativeG`, { valueAsNumber: true })}
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">
              g
            </span>
          </div>
          <input
            aria-label={`${index + 1}번째 단계 메모`}
            placeholder="메모 (선택)"
            className={cn(inputClass, "col-span-2 h-9 text-sm sm:col-span-3")}
            {...register(`steps.${index}.note`)}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`${index + 1}번째 단계 삭제`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {messages.length > 0 && (
        <p role="alert" className="mt-1.5 pl-9 text-sm text-destructive">
          {messages.join(" · ")}
        </p>
      )}
    </li>
  );
}
