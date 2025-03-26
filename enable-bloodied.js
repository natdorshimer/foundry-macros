const getStates = (actor) => {
    const stateToFile = actor.flags?.personal?.tokens?.stateToFile;
    if (!stateToFile) return {};
    return Object.keys(stateToFile);
}

const getStateToFile = (actor) => {
    return actor.flags?.personal?.tokens?.stateToFile
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

const setTokenImageByFile = async (token, file) => {
    await token.document.update({ "texture.src": file})
}

const getCurrentSelectionForToken = (token) => {
    const fileName = token.document.texture.src;
    const stateToFile = token.actor.flags?.personal?.tokens?.stateToFile;
    if (!stateToFile) return null;

    const res = Object.entries(stateToFile).find(([_, value]) => value === fileName);
    if (res) {
        return res[0];
    }
    return null;
}

const toggleTokenImage = async () => {
    const states = getStates(_token.actor);

    const currentSelection = getCurrentSelectionForToken(_token);
    if (!currentSelection) return;

    const currentIndex = states.indexOf(currentSelection);

    const nextIndex = (currentIndex + 1) % states.length;
    const nextState = states[nextIndex];

    const file = getFileForState(_token.actor, nextState);
    await setTokenImageByFile(_token, file);
}

const setTokenImageByStateFuzzy = async (token, state) => {
    const stateToFile = token.actor.flags.personal.tokens.stateToFile;
    const res = Object.entries(stateToFile).find(([stateKey, _]) => stateKey.toLowerCase().includes(state.toLowerCase()));
    if (!res) return;

    const file = res[1];
    await setTokenImageByFile(_token, file)
}

const getCurrentState = (token) => {
    const stateToFile = token.actor.flags?.personal?.tokens?.stateToFile;
    if (!stateToFile) return null;
    const file = token.document.texture.src;
    return Object.entries(stateToFile).find(([state, value]) => value === file)[0];
}

const isCurrentTokenBloodied = (token) => {
    const stateToFile = getStateToFile(token.actor);
    if (!stateToFile) return false;
    
    const currentState = getCurrentState(token);
    if (!currentState) return false;

    return currentState.toLowerCase().includes("bloodied");
}

Hooks.on("updateActor", async (actor, _) => {
    const is_bloodied = actor.system.attributes.hp.value / actor.system.attributes.hp.max <= 0.5;
    const bloody_enabled = actor.flags?.personal?.tokens?.bloodied;

    const isTokenBloodied = isCurrentTokenBloodied(_token);
    if (is_bloodied && bloody_enabled && !isTokenBloodied) {
        await setTokenImageByStateFuzzy(_token, "bloodied");
    }

    if (!is_bloodied && bloody_enabled && isTokenBloodied) {
        await toggleTokenImage();
    }
});