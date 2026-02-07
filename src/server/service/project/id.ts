export const encodeProjectId = (fullPath: string) => {
  return Buffer.from(fullPath).toString("base64url");
};

export const decodeProjectId = (id: string) => {
  return Buffer.from(id, "base64url").toString("utf-8");
};
