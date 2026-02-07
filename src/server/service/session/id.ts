export const encodeSessionId = (filePath: string) => {
  return Buffer.from(filePath).toString("base64url");
};

export const decodeSessionId = (id: string) => {
  return Buffer.from(id, "base64url").toString("utf-8");
};
