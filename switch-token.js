const getStates = (actor) => {
    const stateToFile = actor.flags?.personal?.tokens?.stateToFile;
    if (!stateToFile) return {};
    return Object.keys(stateToFile);
}

const getStateToFile = (actor) => {
    return actor.flags.personal.tokens.stateToFile
}

const initFlags = async (actor) => {
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

const setBloodyEnabled = async (actor, enabled) => {
    await actor.update({
        "flags.personal.tokens.bloodied": enabled
    });
}

const getFileForState = (actor, state) => {
    const stateToFile = actor.flags.personal.tokens.stateToFile;
    return stateToFile[state];
}

const deleteImageFromState = async (actor, state) => {
    await _token.actor.update({
        [`flags.personal.tokens.stateToFile.-=${state}`]: null
    });
}


const promptFileSelection = ({ type = "image", current = "" } = {}) => {
    try {
        return new Promise((resolve) => {
            new FilePicker({
              type,
              current,
              callback: (path) => {
                resolve(path); // Resolve the promise when a file is selected
              }
            }).render(true);
          });
    } catch (error) {
        console.log("Error in promptFileSelection", error);
        return null;
    }
    
  }

const promptForFileName = async (defaultValue = null) => {
    try {
        const defaultVal = defaultValue || "";
        return await Dialog.wait({
            title: "Input File Name",
            content: `
                <p>Input name of file:</p>
                <input type="text" id="file-name-input" value="${defaultVal}" style="width:100%" />
            `,
            buttons: {
                option1: {
                    label: "Confirm",
                    callback: (html) => {
                        const name = html.find("input").val();
                        return name;
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
    const stateName = await promptForFileName(state);
    if (!stateName) return;

    const file = getFileForState(actor, state);

    await deleteImageFromState(actor, state);
    await setStateFlag(actor, stateName, file);
}

const promptForTokenImage = async () => {
    const states = getStates(_token.actor);
    const currentSelection = getCurrentSelectionForToken(_token);

    return await Dialog.wait({
        title: "Choose an Option",
        content: `
          <form>
          <div class="form-group">
              <label>Token Image</label>
              <select id="action">
              ${states.map(o => {
                const selected = currentSelection && currentSelection === o ? "selected" : "";
                return `<option ${selected} value="${o}">${o}</option>`
              }).join("")
              }
              </select>
          </div>
          <input id="bloody" type=checkbox switch checked>Bloodied Enabled</input>
          </form>
        `,
        buttons: {
            option1: {
                label: "Change Image",
                callback: async (html) => {
                    const selectedImage = html.find("#action").val();
                    const selectedAction = states.find(it => it.label === selectedImage)

                    const filePath = await promptFileSelection();
                    if (!filePath) {
                        promptForTokenImage();
                        return;
                    }

                    await setStateFlag(_token.actor, selectedImage, filePath);
                    promptForTokenImage();
                    return selectedAction;
                }
            },
            option2: {
                label: "Add Image",
                callback: async () => {
                    const filePath = await promptFileSelection();
                    if (!filePath) return;

                    const splitFilePath = filePath.split("/");
                    const fileNameSplit = splitFilePath[splitFilePath.length - 1].split(".")[0];

                    const mappingName = await promptForFileName(fileNameSplit);

                    if (!mappingName) {
                        promptForTokenImage();
                        return
                    }

                    await setStateFlag(_token.actor, mappingName, filePath);
                    promptForTokenImage();
                }
            },
            option3: {
                label: "Use Image",
                callback: async (html) => {
                    const selectedImage = html.find("#action").val();
                    const file = getFileForState(_token.actor, selectedImage);
                    await setTokenImageByFile(_token, file);

                    const bloody = html.find("#bloody").is(":checked");
                    await setBloodyEnabled(_token.actor, bloody);
                }
            },
            option4: {
                label: "Delete",
                callback: async (html) => {
                    const selectedImage = html.find("#action").val();
                    const file = getFileForState(_token.actor, selectedImage);

                    if (file === undefined) {
                        ui.notifications.error("No file found for state");
                        return;
                    };

                    await deleteImageFromState(_token.actor, selectedImage);
                    promptForTokenImage();
                }
            },
            option5: {
                label: "Change Name",
                callback: async (html) => {
                    const selectedImage = html.find("#action").val();
                    await changeNameForFile(_token.actor, selectedImage);
                    promptForTokenImage();
                }
            }
        },
        default: "option3"
    });
}

const toggleTokenImage = async () => {
    const states = getStates(_token.actor);

    const currentSelection = getCurrentSelectionForToken(_token);
    const currentIndex = states.indexOf(currentSelection);

    const nextIndex = (currentIndex + 1) % states.length;
    const nextState = states[nextIndex];

    const file = getFileForState(_token.actor, nextState);
    await setTokenImageByFile(_token, file);
}

await promptForTokenImage();