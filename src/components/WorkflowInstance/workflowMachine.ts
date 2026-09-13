import { assign, setup } from "xstate";

interface WorkflowInstanceMachineContext {
  mutatingInstanceId: string | null;
}

type WorkflowInstanceMachineEvent =
  | { type: "LOAD" }
  | { type: "LOADED" }
  | { type: "LOAD_FAILED" }
  | { type: "MUTATE"; instanceId: string }
  | { type: "ACTION_FAILED" };

export const workflowInstanceMachine = setup({
  types: {
    context: {} as WorkflowInstanceMachineContext,
    events: {} as WorkflowInstanceMachineEvent,
  },
}).createMachine({
  id: "workflowInstance",
  initial: "loading",
  context: { mutatingInstanceId: null },
  states: {
    loading: {
      on: {
        LOADED: "ready",
        LOAD_FAILED: "error",
      },
    },
    ready: {
      on: {
        LOAD: "loading",
        MUTATE: {
          target: "mutating",
          actions: assign({ mutatingInstanceId: ({ event }) => event.instanceId }),
        },
      },
    },
    mutating: {
      on: {
        LOADED: {
          target: "ready",
          actions: assign({ mutatingInstanceId: null }),
        },
        ACTION_FAILED: {
          target: "ready",
          actions: assign({ mutatingInstanceId: null }),
        },
      },
    },
    error: {
      on: {
        LOAD: "loading",
        LOADED: "ready",
      },
    },
  },
});
