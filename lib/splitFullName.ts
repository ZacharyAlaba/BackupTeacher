export function splitFullName(name: string) {
  const [firstName = "", ...lastNameParts] = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}
