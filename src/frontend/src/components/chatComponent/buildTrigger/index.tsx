import { useContext, useState } from "react";
import { Transition } from "@headlessui/react";
import { Zap } from "lucide-react";
import { validateNodes } from "../../../utils";
import { FlowType } from "../../../types/flow";
import Loading from "../../../components/ui/loading";
import { useSSE } from "../../../contexts/SSEContext";
import { typesContext } from "../../../contexts/typesContext";
import { alertContext } from "../../../contexts/alertContext";
import { postBuildInit } from "../../../controllers/API";

import RadialProgressComponent from "../../RadialProgress";
import { TabsContext } from "../../../contexts/tabsContext";

export default function BuildTrigger({
  open,
  flow,
  setIsBuilt,
}: {
  open: boolean;
  flow: FlowType;
  setIsBuilt: any;
  isBuilt: boolean;
}) {
  const { updateSSEData, isBuilding, setIsBuilding, sseData } = useSSE();
  const { reactFlowInstance } = useContext(typesContext);
  const { setTabsState } = useContext(TabsContext);
  const { setErrorData, setSuccessData } = useContext(alertContext);
  const [isIconTouched, setIsIconTouched] = useState(false);
  const eventClick = isBuilding ? "pointer-events-none" : "";
  const [progress, setProgress] = useState(0);

  async function handleBuild(flow: FlowType) {
    try {
      if (isBuilding) {
        return;
      }
      const errors = validateNodes(reactFlowInstance);
      if (errors.length > 0) {
        setErrorData({
          title: "Oops! Looks like you missed something",
          list: errors,
        });
        return;
      }
      const minimumLoadingTime = 200; // in milliseconds
      const startTime = Date.now();
      setIsBuilding(true);

      const allNodesValid = await streamNodeData(flow);
      await enforceMinimumLoadingTime(startTime, minimumLoadingTime);
      setIsBuilt(allNodesValid);
      if (!allNodesValid) {
        setErrorData({
          title: "Oops! Looks like you missed something",
          list: [
            "Check components and retry. Hover over component status icon 🔴 to inspect.",
          ],
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsBuilding(false);
    }
  }
  async function streamNodeData(flow: FlowType) {
    // Step 1: Make a POST request to send the flow data and receive a unique session ID
    const response = await postBuildInit(flow);
    const { flowId } = response.data;
    // Step 2: Use the session ID to establish an SSE connection using EventSource
    let validationResults = [];
    let finished = false;
    const apiUrl = `/api/v1/build/stream/${flowId}`;
    const eventSource = new EventSource(apiUrl);

    eventSource.onmessage = (event) => {
      // If the event is parseable, return
      if (!event.data) {
        return;
      }
      const parsedData = JSON.parse(event.data);
      // if the event is the end of the stream, close the connection
      if (parsedData.end_of_stream) {
        eventSource.close();

        return;
      } else if (parsedData.log) {
        // If the event is a log, log it
        setSuccessData({ title: parsedData.log });
      } else if (parsedData.input_keys) {
        setTabsState((old) => {
          return {
            ...old,
            [flowId]: {
              ...old[flowId],
              formKeysData: parsedData,
            },
          };
        });
      } else {
        // Otherwise, process the data
        const isValid = processStreamResult(parsedData);
        setProgress(parsedData.progress);
        validationResults.push(isValid);
      }
    };

    eventSource.onerror = (error: any) => {
      console.error("EventSource failed:", error);
      eventSource.close();
      if (error.data) {
        const parsedData = JSON.parse(error.data);
        setErrorData({ title: parsedData.error });
        setIsBuilding(false);
      }
    };
    // Step 3: Wait for the stream to finish
    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      finished = validationResults.length === flow.data.nodes.length;
    }
    // Step 4: Return true if all nodes are valid, false otherwise
    return validationResults.every((result) => result);
  }

  function processStreamResult(parsedData) {
    // Process each chunk of data here
    // Parse the chunk and update the context
    try {
      updateSSEData({ [parsedData.id]: parsedData });
    } catch (err) {
      console.log("Error parsing stream data: ", err);
    }
    return parsedData.valid;
  }

  async function enforceMinimumLoadingTime(
    startTime: number,
    minimumLoadingTime: number
  ) {
    const elapsedTime = Date.now() - startTime;
    const remainingTime = minimumLoadingTime - elapsedTime;

    if (remainingTime > 0) {
      return new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  }

  const handleMouseEnter = () => {
    setIsIconTouched(true);
  };

  const handleMouseLeave = () => {
    setIsIconTouched(false);
  };

  return (
    <Transition
      show={!open}
      appear={true}
      enter="transition ease-out duration-300"
      enterFrom="translate-y-96"
      enterTo="translate-y-0"
      leave="transition ease-in duration-300"
      leaveFrom="translate-y-0"
      leaveTo="translate-y-96"
    >
      <div className="fixed bottom-20 right-4">
        <div
          className={`${eventClick} align-center shadow-round-btn-shadow hover:shadow-round-btn-shadow flex h-12 w-12 cursor-pointer justify-center rounded-full bg-border px-3 py-1 shadow-md`}
          onClick={() => {
            handleBuild(flow);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button>
            <div className="flex items-center gap-3">
              {isBuilding && progress < 1 ? (
                // Render your loading animation here when isBuilding is true
                <RadialProgressComponent
                  // ! confirm below works
                  color={"text-build-trigger"}
                  value={progress}
                ></RadialProgressComponent>
              ) : isBuilding ? (
                <Loading strokeWidth={1.5} className="stroke-build-trigger" />
              ) : (
                <Zap
                  strokeWidth={1.5}
                  className="sh-6 w-6 fill-build-trigger stroke-build-trigger stroke-1"
                />
              )}
            </div>
          </button>
        </div>
      </div>
    </Transition>
  );
}
