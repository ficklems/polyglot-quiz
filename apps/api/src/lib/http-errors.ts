/** An error the error handler turns into a 4xx response with this status and message. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    name: string,
    message: string,
  ) {
    super(message);
    this.name = name;
  }
}

export const badRequest = (message: string) => new HttpError(400, 'Bad Request', message);
export const notFound = (message: string) => new HttpError(404, 'Not Found', message);
export const conflict = (message: string) => new HttpError(409, 'Conflict', message);
export const unprocessable = (message: string) =>
  new HttpError(422, 'Unprocessable Entity', message);
