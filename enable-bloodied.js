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
    if (!res) {
        ui.notifications.error(`State ${state} not found. Add an image for this state in the actor's token settings.`);
        return;
    }

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

const isCurrentTokenCombat = (token) => {
    return isCurrentTokenStateFuzzy(token, "combat");
}

const hasTokenState = (token, state) => {
    const stateToFile = getStateToFile(token.actor);
    if (!stateToFile) return false;
    return getStates(token.actor).find(s => s.toLowerCase().includes(state.toLowerCase())) !== undefined;
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

const shouldSetCombatToken = (token, isEncounter) => {
    return isEncounter 
        && hasTokenState(token, "combat") 
        && !isCurrentTokenCombat(token);
}

const unbloodyToken = async (token, isEncounter) => {
    if (shouldSetCombatToken(token, isEncounter)) {
        await setTokenImageByStateFuzzy(token, "combat");
        return;
    }

    await toggleTokenImage();
}

const updateActorToken = async (token, actorBloodied, isEncounter, tokenBloodied, tokenCombat) => {
    if (actorBloodied && !tokenBloodied) {
        await setTokenImageByStateFuzzy(token, "bloodied");
        return;
    }
    
    if (!actorBloodied && tokenBloodied) {
        await unbloodyToken(token, isEncounter);
        return;
    }

    if (isEncounter && !tokenCombat) {
        await setTokenImageByStateFuzzy(token, "combat");
        return;
    }

    if (!isEncounter && tokenCombat) {
        await setTokenImageByStateFuzzy(token, "normal");
        return;
    }
}

const isActorBloodied = (actor) => {
    const hp = actor.system.attributes.hp
    return hp.value / hp.max <= 0.5;
}

const updateTokenImage = async (token, isEncounter) => {
    const bloodyEnabled = actor.flags?.personal?.tokens?.bloodied;
    if (!bloodyEnabled) return;

    await updateActorToken(
        token, 
        isActorBloodied(actor), 
        isEncounter, 
        isCurrentTokenBloodied(token), 
        isCurrentTokenCombat(token)
    );
}

Hooks.on("updateActor", async (actor, _) => {
    await updateTokenImage(_token, isEncounter());
});

Hooks.on("combatStart", async () => {
    await updateTokenImage(_token, true);
});