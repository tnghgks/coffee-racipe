import { z } from "zod";

/** Shared by the profile form (client) and the server action. Mirrors the profiles table checks. */
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "영문 소문자·숫자·밑줄(_)로 3~20자"),
  displayName: z.string().trim().min(1, "이름을 입력해 주세요").max(50, "50자 이내로 입력해 주세요"),
  bio: z.string().trim().max(300, "300자 이내로 입력해 주세요"),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

export const devLoginSchema = z.object({
  email: z.email("이메일 형식이 아니에요"),
  password: z.string().min(6, "6자 이상"),
});
