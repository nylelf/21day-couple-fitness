export const DAYS = 21;

export const ROLE_MALE = "male";
export const ROLE_FEMALE = "female";

export function roleLabel(role) {
  return role === ROLE_MALE ? "♂ 男生" : "♀ 女生";
}

export function oppositeRole(role) {
  return role === ROLE_MALE ? ROLE_FEMALE : ROLE_MALE;
}
