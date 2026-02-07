import { z } from "zod";

const regExp = /<(?<tag>[^>]+)>(?<content>\s*[^<]*?\s*)<\/\k<tag>>/g;

const matchSchema = z.object({
  tag: z.string(),
  content: z.string(),
});

export type ParsedCommand =
  | {
      kind: "command";
      commandName: string;
      commandArgs?: string;
      commandMessage?: string;
    }
  | {
      kind: "local-command";
      stdout: string;
    }
  | {
      kind: "text";
      content: string;
    };

export const parseCommandXml = (content: string): ParsedCommand => {
  const matches = Array.from(content.matchAll(regExp))
    .map((match) => matchSchema.safeParse(match.groups))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (matches.length === 0) {
    return {
      kind: "text",
      content,
    };
  }

  const commandName = matches.find(
    (match) => match.tag === "command-name",
  )?.content;
  const commandArgs = matches.find(
    (match) => match.tag === "command-args",
  )?.content;
  const commandMessage = matches.find(
    (match) => match.tag === "command-message",
  )?.content;
  const localCommandStdout = matches.find(
    (match) => match.tag === "local-command-stdout",
  )?.content;

  switch (true) {
    case commandName !== undefined:
      return {
        kind: "command",
        commandName,
        commandArgs,
        commandMessage,
      };
    case localCommandStdout !== undefined:
      return {
        kind: "local-command",
        stdout: localCommandStdout,
      };
    default:
      return {
        kind: "text",
        content,
      };
  }
};
