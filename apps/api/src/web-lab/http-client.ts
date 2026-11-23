import { BadRequestException } from "@nestjs/common";

const HTTP_STATUS_TEXT: Record<number, string> = {
  200: "OK",
  400: "Bad Request",
  403: "Forbidden",
  422: "Unprocessable Content",
  404: "Not Found",
  500: "Internal Server Error",
};

export function webLabCurl(
  args: string[],
  request: (value: string) => { status: number; body: string },
) {
  const includeHeaders = args[0] === "-i";
  const values = includeHeaders ? args.slice(1) : args;
  if (values.length !== 1 || values[0].startsWith("-"))
    return "Uso: curl [-i] <URL-del-laboratorio>";
  const value = values[0].replace(/^(["'])(.*)\1$/, "$2");
  try {
    const response = request(value);
    return (
      (includeHeaders
        ? `HTTP/1.1 ${response.status} ${HTTP_STATUS_TEXT[response.status] ?? "Response"}\r\nContent-Type: application/json\r\n\r\n`
        : "") + JSON.stringify(response, null, 2)
    );
  } catch (error) {
    if (error instanceof BadRequestException) return `curl: ${error.message}`;
    throw error;
  }
}
