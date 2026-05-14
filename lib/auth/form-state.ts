export type AuthFormState = {
  ok: boolean;
  message: string;
};

export const defaultAuthFormState: AuthFormState = {
  ok: false,
  message: "",
};
