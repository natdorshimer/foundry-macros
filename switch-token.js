const getStates = (actor) => {
    const stateToFile = actor.flags?.personal?.tokens?.stateToFile;
    if (!stateToFile) return {};

    return Object.keys(stateToFile);
}

const getStateToFile = (actor) => {
    return actor.flags.personal.tokens.stateToFile
}

const areFlagsInitialized = (actor) => {
    const tokens = actor.flags?.personal?.tokens;
    return tokens && tokens?.stateToFile;
}

const initFlags = async (actor) => {
    if (areFlagsInitialized(actor)) { 
        return;
    }

    const personal = actor.flags.personal || {};
    personal.tokens = personal.tokens || {};
    personal.tokens.stateToFile = personal.tokens.stateToFile || {};
    await actor.update({
        "flags.personal": personal
    });
}

await initFlags(_token.actor);

const setStateFlag = async (actor, state, path) => {
    update_obj = {
        [`flags.personal.tokens.stateToFile.${state}`]: path
    };
    await actor.update(update_obj);
}

const deleteImageFromState = async (actor, state) => {
    await actor.update({
        [`flags.personal.tokens.stateToFile.-=${state}`]: null
    });
}

const setBloodyEnabled = async (actor, enabled) => {
    await actor.update({
        "flags.personal.tokens.bloodied": enabled
    });
}

const getFileForState = (actor, state) => {
    const stateToFile = actor.flags.personal.tokens.stateToFile;
    return stateToFile[state];
}

const promptFileSelection = ({ type = "image", current = "" } = {}) => {
    try {
        return new Promise((resolve) => {
            new FilePicker({
              type,
              current,
              callback: resolve
            }).render(true);
          });
    } catch (error) {
        console.log("Error in promptFileSelection", error);
        return null;
    }
  }

const promptForStateName = async (defaultValue = null) => {
    try {
        const defaultVal = defaultValue || "";
        const fileNameInputId = "file-name-input";

        return await Dialog.wait({
            title: "Input File Name",
            content: `
                <p>Input name of file</p>
                <input type="text" id="${fileNameInputId}" value="${defaultVal}" style="width:100%" />
            `,
            buttons: {
                option1: {
                    label: "Confirm",
                    callback: (html) => {
                        return html.find(`#${fileNameInputId}`).val();
                    }
                },
            },
            default: "option1"
        });
    } catch (error) {
        console.log("Error in promptForFileName", error);
        return;
    }
}

const setTokenImageByFile = async (token, file) => {
    await token.document.update({ "texture.src": file})
}

const getCurrentSelectionForToken = (token) => {
    const fileName = token.document.texture.src;
    const stateToFile = token.actor.flags.personal.tokens.stateToFile;
    const res = Object.entries(stateToFile).find(([_, value]) => value === fileName);
    if (res) {
        return res[0];
    }
    return null;
}

const changeNameForFile = async (actor, state) => {
    const stateName = await promptForStateName(state);
    if (!stateName) return;

    const file = getFileForState(actor, state);

    await deleteImageFromState(actor, state);

    if (file) {
        await setStateFlag(actor, stateName, file);
    }
}

const getHtmlForTokenImage = (states, currentSelection) => {
    const options = states.map(o => {
        const selected = currentSelection && currentSelection === o ? "selected" : "";
        return `<option ${selected} value="${o}">${o}</option>`
      }).join("");

    return `
        <div>
            <label>Token Image</label>
            <select id="selectedState">
                ${options}
            </select>
        </div>
        <input id="bloody" type=checkbox switch checked>Bloodied Enabled</input>
    `;
}

const promptForTokenImage = async (selectedStateName = null) => {
    const states = getStates(_token.actor);
    const currentSelection = getCurrentSelectionForToken(_token);

    return await Dialog.wait({
        title: "Choose an Option",
        content: getHtmlForTokenImage(states, selectedStateName || currentSelection),
        buttons: {
            option1: {
                label: "Change Image",
                callback: async (html) => {
                    const selectedImage = html.find("#selectedState").val();
                    const selectedState = states.find(it => it.label === selectedImage)

                    const filePath = await promptFileSelection();
                    if (!filePath) {
                        promptForTokenImage();
                        return;
                    }

                    await setStateFlag(_token.actor, selectedImage, filePath);
                    promptForTokenImage();
                    return selectedState;
                }
            },
            option2: {
                label: "Add Image",
                callback: async () => {
                    const filePath = await promptFileSelection();
                    if (!filePath) return;

                    const splitFilePath = filePath.split("/");
                    const fileNameSplit = splitFilePath[splitFilePath.length - 1].split(".")[0];

                    const stateName = await promptForStateName(fileNameSplit);

                    if (!stateName) {
                        promptForTokenImage();
                        return
                    }

                    await setStateFlag(_token.actor, stateName, filePath);
                    promptForTokenImage(stateName);
                }
            },
            option3: {
                label: "Use Image",
                callback: async (html) => {
                    const selectedImage = html.find("#selectedState").val();
                    const file = getFileForState(_token.actor, selectedImage);

                    if (!file) {
                        ui.notifications.error("No file found for state. Deleting state.");
                        await deleteImageFromState(_token.actor, selectedImage);
                        return;
                    }

                    await setTokenImageByFile(_token, file);

                    const bloody = html.find("#bloody").is(":checked");
                    await setBloodyEnabled(_token.actor, bloody);
                }
            },
            option4: {
                label: "Delete",
                callback: async (html) => {
                    const selectedState = html.find("#selectedState").val();
                    await deleteImageFromState(_token.actor, selectedState);
                    promptForTokenImage();
                }
            },
            option5: {
                label: "Change Name",
                callback: async (html) => {
                    const selectedImage = html.find("#selectedState").val();
                    await changeNameForFile(_token.actor, selectedImage);
                    promptForTokenImage();
                }
            }
        },
        default: "option3"
    });
}

await promptForTokenImage();