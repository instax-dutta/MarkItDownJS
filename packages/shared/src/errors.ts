export class MarkItDownError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "MarkItDownError";
  }
}

export class UnsupportedFormatError extends MarkItDownError {
  constructor(format: string) {
    super(`Unsupported format: ${format}`, "UNSUPPORTED_FORMAT");
    this.name = "UnsupportedFormatError";
  }
}

export class ConversionError extends MarkItDownError {
  constructor(
    message: string,
    public readonly converterId?: string,
    cause?: Error
  ) {
    super(message, "CONVERSION_ERROR", cause);
    this.name = "ConversionError";
  }
}

export class FileReadError extends MarkItDownError {
  constructor(message: string, cause?: Error) {
    super(message, "FILE_READ_ERROR", cause);
    this.name = "FileReadError";
  }
}

export class ParseError extends MarkItDownError {
  constructor(message: string, cause?: Error) {
    super(message, "PARSE_ERROR", cause);
    this.name = "ParseError";
  }
}

export class PluginError extends MarkItDownError {
  constructor(message: string, cause?: Error) {
    super(message, "PLUGIN_ERROR", cause);
    this.name = "PluginError";
  }
}

export class CancellationError extends MarkItDownError {
  constructor() {
    super("Conversion was cancelled", "CANCELLED");
    this.name = "CancellationError";
  }
}
