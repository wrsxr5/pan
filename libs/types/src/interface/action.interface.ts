import type { Library, LibraryInfo, LibraryTitle } from './library.interface';

export type ActionType = 'CLIENT' | 'SERVER';

interface BaseActionConfig {
  name: string;
  type: ActionType;
  isDefault?: boolean;
  selectedTitle?: boolean;
  library?: boolean;
  libraryInfo?: boolean;
  libraryTitles?: boolean;
}

export interface ClientActionConfig extends BaseActionConfig {
  type: 'CLIENT';
}

export interface ServerActionConfig extends BaseActionConfig {
  type: 'SERVER';
  filename: string;
  file: string;
}

export interface ActionConfig {
  actions: (ClientActionConfig | ServerActionConfig)[];
}

export interface ActionContext {
  directory: string;
  selectedEntries: string[];
  selectedTitle?: LibraryTitle;
  library?: Library;
  libraryInfo?: LibraryInfo;
  libraryTitles?: LibraryTitle[];
}

export interface ClientAction {
  config: ClientActionConfig;
  context: ActionContext;
}

export interface ServerAction {
  config: ServerActionConfig;
  context: ActionContext;
}

export type Action = ClientAction | ServerAction;

export type ActionHandler = (context: ActionContext) => void | Promise<void>;

export const ACTION_KEY = 'action';

export function registerActionHandler(worker: Worker, handler: ActionHandler) {
  worker.onmessage = async (event: MessageEvent) => {
    if (event.data && event.data.key === ACTION_KEY) {
      const context = event.data.value as ActionContext;
      try {
        await handler(context);
      } catch (error) {
        worker.postMessage({ key: ACTION_KEY, value: error });
        return;
      }
    }
    worker.postMessage({ key: ACTION_KEY });
  };
}

export interface ActionRequest {
  name: string;
  directory: string;
  selectedEntries: string[];
}

export interface ActionContextId {
  id: string;
}
