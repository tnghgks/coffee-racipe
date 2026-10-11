/** Like/save state shared by the server query, the Server Action and the buttons (pure, no imports). */

export type ReactionKind = "like" | "save";

export type ReactionState = {
  likes: number;
  saves: number;
  liked: boolean;
  saved: boolean;
};

/** What the button shows right after a click, before the server answers. */
export function applyReaction(state: ReactionState, kind: ReactionKind, active: boolean): ReactionState {
  if (kind === "like") {
    if (state.liked === active) return state;
    return { ...state, liked: active, likes: Math.max(state.likes + (active ? 1 : -1), 0) };
  }
  if (state.saved === active) return state;
  return { ...state, saved: active, saves: Math.max(state.saves + (active ? 1 : -1), 0) };
}
