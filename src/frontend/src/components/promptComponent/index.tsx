import { useContext, useEffect, useState } from "react";
import { PopUpContext } from "../../contexts/popUpContext";
import { TextAreaComponentType } from "../../types/components";
import GenericModal from "../../modals/genericModal";
import { TypeModal } from "../../utils";
import { INPUT_STYLE } from "../../constants";
import { ExternalLink } from "lucide-react";
import { postValidatePrompt } from "../../controllers/API";
import { typesContext } from "../../contexts/typesContext";
import * as _ from "lodash";

export default function PromptAreaComponent({
  setNodeClass,
  nodeClass,
  value,
  onChange,
  disabled,
  editNode = false,
}: TextAreaComponentType) {
  const [myValue, setMyValue] = useState("");
  const { openPopUp } = useContext(PopUpContext);
  const { reactFlowInstance } = useContext(typesContext);

  useEffect(() => {
    if (disabled) {
      setMyValue("");
      onChange("");
    }
  }, [disabled, onChange]);

  useEffect(() => {
    if (value !== "" && myValue !== value && reactFlowInstance) { // only executed once
      setMyValue(value);
      postValidatePrompt(value, nodeClass)
        .then((apiReturn) => {
          if (apiReturn.data) {
            setNodeClass(apiReturn.data.frontend_node);
            // need to update reactFlowInstance to re-render the nodes.
            reactFlowInstance.setEdges(_.cloneDeep(reactFlowInstance.getEdges()));
          }
        })
        .catch((error) => {});
    }
  }, [reactFlowInstance]);

  return (
    <div
      className={
        disabled ? "pointer-events-none cursor-not-allowed w-full" : " w-full"
      }
    >
      <div className="w-full flex items-center gap-3">
        <span
          onClick={() => {
            openPopUp(
              <GenericModal
                type={TypeModal.PROMPT}
                value={myValue}
                buttonText="Check & Save"
                modalTitle="Edit Prompt"
                setValue={(t: string) => {
                  setMyValue(t);
                  onChange(t);
                }}
                nodeClass={nodeClass}
                setNodeClass={setNodeClass}
              />
            );
          }}
          className={
            editNode
              ? "cursor-pointer truncate placeholder:text-center text-gray-500 border-1 block w-full pt-0.5 pb-0.5 form-input dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 rounded-md border-gray-300 shadow-sm sm:text-sm" +
                INPUT_STYLE
              : "truncate block w-full text-gray-500 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 shadow-sm sm:text-sm" +
                (disabled ? " bg-gray-200" : "")
          }
        >
          {myValue !== "" ? myValue : "Type your prompt here"}
        </span>
        <button
          onClick={() => {
            openPopUp(
              <GenericModal
                type={TypeModal.PROMPT}
                value={myValue}
                buttonText="Check & Save"
                modalTitle="Edit Prompt"
                setValue={(t: string) => {
                  setMyValue(t);
                  onChange(t);
                }}
                nodeClass={nodeClass}
                setNodeClass={setNodeClass}
              />
            );
          }}
        >
          {!editNode && (
            <ExternalLink className="w-6 h-6 hover:text-ring dark:text-gray-300" />
          )}
        </button>
      </div>
    </div>
  );
}
