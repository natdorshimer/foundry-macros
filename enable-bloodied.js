const getStates = (actor) => {
    const stateToFile = getStateToFile(actor);
    if (!stateToFile) return {};
    return Object.keys(stateToFile);
}

const getStateToFile = (actor) => {
    return actor.flags?.personal?.tokens?.stateToFile
}

const getFileForState = (actor, state) => {
    const stateToFile = getStateToFile(actor);
    if (!stateToFile) return null;

    return stateToFile[state];
}

const setTokenImageByFile = async (token, file) => {
    await token.document.update({ "texture.src": file})
}

const getCurrentSelectionForToken = (token) => {
    const fileName = token.document.texture.src;
    const stateToFile = getStateToFile(token.actor);
    if (!stateToFile) return null;

    const res = Object.entries(stateToFile).find(([_, value]) => value === fileName);
    return res ? res[0] : null;
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
    const stateToFile = getStateToFile(token.actor);
    const res = Object.entries(stateToFile).find(([stateKey, _]) => stateKey.toLowerCase().includes(state.toLowerCase()));
    if (!res) return;

    const file = res[1];
    await setTokenImageByFile(_token, file)
}

const getCurrentState = (token) => {
    const stateToFile = getStateToFile(token.actor);
    if (!stateToFile) return null;

    const file = token.document.texture.src;
    return Object.entries(stateToFile).find(([state, value]) => value === file)[0];
}

const isCurrentTokenBloodied = (token) => {
    return isCurrentTokenStateFuzzy(token, "bloodied");
}

const isCurrentTokenStateFuzzy = (token, state) => {
    const stateToFile = getStateToFile(token.actor);
    if (!stateToFile) return false;
    
    const currentState = getCurrentState(token);
    if (!currentState) return false;

    return currentState.toLowerCase().includes(state.toLowerCase());
}

const isEncounter = () => {
    return game.combat?.started
}

const unbloodyToken = async (token) => {
    if (isEncounter()) {
        await setTokenImageByStateFuzzy(token, "combat");
        return;
    }

    await toggleTokenImage();
}

Hooks.on("updateActor", async (actor, _) => {
    const hp = actor.system.attributes.hp
    const isBloodied = hp.value / hp.max <= 0.5;

    const bloodyEnabled = actor.flags?.personal?.tokens?.bloodied;
    if (!bloodyEnabled) return;

    const isTokenBloodied = isCurrentTokenBloodied(_token);

    const shouldBloody = isBloodied && !isTokenBloodied;
    const shouldUnbloody = !isBloodied && isTokenBloodied;

    if (shouldBloody) {
        await setTokenImageByStateFuzzy(_token, "bloodied");
    } else if (shouldUnbloody) {
        await unbloodyToken(_token);
    }
});