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
    if (!res) {
        console.log("No state found for", state);
        return;
    }

    const file = res[1];
    await setTokenImageByFile(token, file)
}

await toggleTokenImage();