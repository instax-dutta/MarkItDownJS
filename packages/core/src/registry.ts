import type {
  Converter,
  ConverterId,
  ConverterRegistry,
  ConversionInput,
  MimeType,
  FileExtension,
  Plugin,
  PluginContext,
  Logger,
  ConversionMiddleware,
} from "@markitdownjs/shared";
import { detectMimeType } from "@markitdownjs/shared";

const consoleLogger: Logger = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

export class DefaultConverterRegistry implements ConverterRegistry {
  private converters = new Map<ConverterId, Converter>();
  private plugins = new Map<string, Plugin>();
  private middlewares: ConversionMiddleware[] = [];
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? consoleLogger;
  }

  register(converter: Converter): void {
    if (this.converters.has(converter.id)) {
      this.logger.warn(`Converter "${converter.id}" is already registered, overwriting.`);
    }
    this.converters.set(converter.id, converter);
    this.logger.debug(`Registered converter: ${converter.id}`);
  }

  unregister(id: ConverterId): void {
    if (!this.converters.has(id)) {
      this.logger.warn(`Converter "${id}" not found, cannot unregister.`);
      return;
    }
    this.converters.delete(id);
    this.logger.debug(`Unregistered converter: ${id}`);
  }

  get(id: ConverterId): Converter | undefined {
    return this.converters.get(id);
  }

  getByMimeType(mimeType: MimeType): Converter | undefined {
    for (const converter of this.converters.values()) {
      if (converter.supportedMimeTypes.includes(mimeType)) {
        return converter;
      }
    }
    return undefined;
  }

  getByExtension(extension: FileExtension): Converter | undefined {
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    for (const converter of this.converters.values()) {
      if (converter.supportedExtensions.includes(ext)) {
        return converter;
      }
    }
    return undefined;
  }

  list(): Converter[] {
    return Array.from(this.converters.values());
  }

  async canConvert(input: ConversionInput): Promise<Converter | undefined> {
    const converters = this.list();

    for (const converter of converters) {
      try {
        if (await converter.canConvert(input)) {
          return converter;
        }
      } catch {
        continue;
      }
    }

    if (input.mimeType) {
      const byMime = this.getByMimeType(input.mimeType);
      if (byMime) return byMime;
    }

    if (input.fileName) {
      const mime = detectMimeType(input.fileName);
      if (mime) {
        const byMime = this.getByMimeType(mime);
        if (byMime) return byMime;
      }
      const dotIndex = input.fileName.lastIndexOf(".");
      if (dotIndex !== -1) {
        const ext = input.fileName.substring(dotIndex);
        const byExt = this.getByExtension(ext);
        if (byExt) return byExt;
      }
    }

    return undefined;
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }

    const context: PluginContext = {
      registry: this,
      logger: this.logger,
      config: {},
    };

    try {
      await plugin.initialize?.(context);
    } catch (error) {
      throw new Error(
        `Failed to initialize plugin "${plugin.id}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }

    if (plugin.converters) {
      for (const converter of plugin.converters) {
        this.register(converter);
      }
    }

    if (plugin.middleware) {
      this.middlewares.push(...plugin.middleware);
      this.middlewares.sort((a, b) => a.priority - b.priority);
    }

    this.plugins.set(plugin.id, plugin);
    this.logger.info(`Registered plugin: ${plugin.id}`);
  }

  async unregisterPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      this.logger.warn(`Plugin "${id}" not found.`);
      return;
    }

    try {
      await plugin.destroy?.();
    } catch (error) {
      this.logger.error(`Error destroying plugin "${id}"`, error);
    }

    if (plugin.converters) {
      for (const converter of plugin.converters) {
        this.unregister(converter.id);
      }
    }

    if (plugin.middleware) {
      this.middlewares = this.middlewares.filter((m) => !plugin.middleware!.includes(m));
    }

    this.plugins.delete(id);
    this.logger.info(`Unregistered plugin: ${id}`);
  }

  addMiddleware(middleware: ConversionMiddleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.priority - b.priority);
  }

  getMiddlewares(): ConversionMiddleware[] {
    return [...this.middlewares];
  }
}
