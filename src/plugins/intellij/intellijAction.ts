import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as intellij from './api';

export interface IntellijScriptData {
  fileName: string;
}

export class IntellijAction {
  id = 'intellij';

  constructor(private scriptData: models.ScriptData | IntellijScriptData) {}

  private isStreamingScript(scriptData: models.ScriptData) {
    return ['onEachLine', 'onEachMessage'].some(obj => scriptData.script.indexOf(obj) > 0);
  }

  async processOnRequest(_request: models.Request, context: models.ProcessorContext): Promise<void> {
    utils.report(context, 'execute Intellij Javascript');
    const scriptData = await this.loadScript(context);
    if (!scriptData || this.isStreamingScript(scriptData)) {
      return;
    }

    const intellijVars = initIntellijVariables(context);
    await this.executeScriptData(scriptData, intellijVars, context);
  }

  async processOnStreaming(context: models.ProcessorContext): Promise<void> {
    const scriptData = await this.loadScript(context);
    if (!scriptData) {
      return;
    }
    this.scriptData = scriptData;
    if (this.isStreamingScript(scriptData) && context.requestClient) {
      const requestClient = context.requestClient;
      await new Promise<void>(resolve => {
        const intellijVars = initIntellijVariables(context);
        intellijVars.response = new intellij.IntellijTextStreamResponse(requestClient, resolve);
        this.executeScriptData(scriptData, intellijVars, context);
      });
    }
  }

  async processOnResponse(response: models.HttpResponse, context: models.ProcessorContext): Promise<void> {
    utils.report(context, 'execute Intellij Javascript');
    const scriptData = await this.loadScript(context);
    if (!scriptData || this.isStreamingScript(scriptData)) {
      return;
    }

    const intellijVars = initIntellijVariables(context);
    intellijVars.response = new intellij.IntellijHttpResponse(response);
    await this.executeScriptData(scriptData, intellijVars, context);
  }

  private async executeScriptData(
    scriptData: models.ScriptData,
    intellijVars: Record<string, unknown>,
    context: models.ProcessorContext
  ) {
    if (io.javascriptProvider.runScript) {
      await io.javascriptProvider.runScript(scriptData.script, {
        fileName: context.httpFile.fileName,
        context: {
          console: context.scriptConsole,
          ...intellijVars,
        },
        lineOffset: scriptData.lineOffset,
      });
      return true;
    }
    return false;
  }

  private async loadScript(context: models.ProcessorContext): Promise<models.ScriptData | undefined> {
    if (this.isIntellijScriptData(this.scriptData)) {
      try {
        return {
          script:
            (await utils.replaceFilePath(this.scriptData.fileName, context, path =>
              io.fileProvider.readFile(path, 'utf-8')
            )) || '',
          lineOffset: 0,
        };
      } catch (err) {
        io.userInteractionProvider.showErrorMessage?.(`error loading script ${this.scriptData.fileName}`);
        (context.scriptConsole || io.log).error(this.scriptData.fileName, err);
        return undefined;
      }
    } else {
      return this.scriptData;
    }
  }

  private isIntellijScriptData(scriptData: IntellijScriptData | models.ScriptData): scriptData is IntellijScriptData {
    const guard = scriptData as IntellijScriptData;
    return !!guard.fileName;
  }
}

function initIntellijVariables(context: models.ProcessorContext) {
  const variables: Record<string, unknown> = {
    client: new intellij.IntellijHttpClient(context),
    crypto: new intellij.IntellijCryptoSupport(),
  };
  if (context.request) {
    variables.request = new intellij.IntellijHttpClientRequest(context);
  }
  return variables;
}
