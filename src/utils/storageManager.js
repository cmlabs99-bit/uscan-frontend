// Token management utilities
export const getStoredToken = () => localStorage.getItem("token");
export const getStoredUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const getTokensFromStorage = () => {
    try {
        const raw = localStorage.getItem("githubApiKeys");
        if (!raw) return [];
        const tokens = JSON.parse(raw);
        return Array.isArray(tokens)
            ? tokens.filter(token => token && token.trim() !== "")
            : [];

    } catch (error) {
        console.error("Error parsing tokens from storage:", error);
        return [];
    }
};


let currentTokenIndex = -1;
export const getSingleToken = () => {
    const tokens = getTokensFromStorage();
    if (!tokens || tokens.length === 0) {
        console.log('No tokens available');
        return null;
    }
    currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
    const token = tokens[currentTokenIndex];
    return token;
};

export const getShowOwnedUsers = () => JSON.parse(localStorage.getItem("showOwnedUsers")) || false;
export const getShowDefaultAvatars = () => JSON.parse(localStorage.getItem("showDefaultAvatars")) || false;
export const getConfirmUSTime = () => JSON.parse(localStorage.getItem("confirmUSTime")) || false;
export const getMinRepositories = () => localStorage.getItem("minRepositories") || "";
export const getMaxRepositories = () => localStorage.getItem("maxRepositories") || "";
export const getMinFollowers = () => localStorage.getItem("minFollowers") || "";
export const getMaxFollowers = () => localStorage.getItem("maxFollowers") || "";
export const getMinSince = () => localStorage.getItem("minJoinedYear") || "";
export const getMaxSince = () => localStorage.getItem("maxJoinedYear") || "";
export const getNameBanList = () => {
    try {
        const raw = localStorage.getItem("archiveNames");
        if (!raw) return [];
        const banNames = JSON.parse(raw);
        return Array.isArray(banNames)
            ? banNames.filter(name => name && name.trim() !== "")
            : [];

    } catch (error) {
        console.error("Error parsing ban names from storage:", error);
        return [];
    }
}
export const getBioBanList = () => {
    try {
        const raw = localStorage.getItem("archiveBios");
        if (!raw) return [];
        const banBios = JSON.parse(raw);
        return Array.isArray(banBios)
            ? banBios.filter(bio => bio && bio.trim() !== "")
            : [];

    } catch (error) {
        console.error("Error parsing ban bios from storage:", error);
        return [];
    }
}

export const initializeItems = () => {
    if (!getShowOwnedUsers()) {
        localStorage.setItem("showOwnedUsers", false);
    }
    if (!getShowDefaultAvatars()) {
        localStorage.setItem("showDefaultAvatars", false);
    }
    if (!getConfirmUSTime()) {
        localStorage.setItem("confirmUSTime", false);
    }
    if (!getSingleToken()) {
        localStorage.setItem("githubApiKeys", []);
    }
    if (!getMinFollowers()) {
        localStorage.setItem("minFollowers", 0);
    }
    if (!getMaxFollowers()) {
        localStorage.setItem("maxFollowers", 60);
    }
    if (!getMinRepositories()) {
        localStorage.setItem("minRepositories", 1);
    }
    if (!getMaxRepositories()) {
        localStorage.setItem("maxRepositories", 50);
    }
    if (!getMinSince()) {
        localStorage.setItem("minJoinedYear", 2014);
    }
    if (!getMaxSince()) {
        localStorage.setItem("maxJoinedYear", 2024);
    }
    if (!getNameBanList()?.length) {
        localStorage.setItem("archiveNames", JSON.stringify(["Vladimir", "Igor", "Sergey", "Dmitry", "Yaroslav", "Maksim", "Andriy", "Oleksandr", "Rajesh", "Sanjay", "Prakash", "Vikram", "Anil", "Ravi", "Sunil", "Deepak", "Arjun", "Mohammed", "Ahmed", "Hussein", "Ali", "Mustafa", "Omar", "Farid", "Karim", "Youssef", "Hiroshi", "Takashi", "Yuki", "Kenji", "Satoshi", "Akira", "Takeshi", "Masaru", "Wei", "Hao", "Jian", "Liang", "Ming", "Tao", "Zhang", "Chen", "Guo", "Fang", "Piotr", "Krzysztof", "Mateusz", "Grzegorz", "Lukasz", "Tomasz", "Andrzej", "Zbigniew", "Jürgen", "Klaus", "Hans", "Dieter", "Wolfgang", "Günter", "Heinz", "Horst", "Rolf", "Giuseppe", "Francesco", "Antonio", "Marco", "Giovanni", "Lorenzo", "Stefano", "Alessandro", "Jean-Pierre", "François", "Jacques", "Henri", "Étienne", "Pascal", "Gérard", "Thierry", "Pavel", "Mikhail", "Oleg", "Nikolai", "Stanislav", "Evgeny", "Boris", "Leonid", "Fatih", "Mehmet", "Ahmet", "Osman", "Emre", "Cem", "Burak", "Erdem", "Javier", "Alfonso", "Miguel", "Rafael", "Jorge", "Pedro", "Fernando", "%ov", "%ova", "%ev", "%eva", "%ich", "%skaya", "%enko", "%inder", "%deep", "%preet", "%jit", "%esh", "%ansh", "%singh", "%kumar", "%raj", "%ullah", "%allah", "%udin", "%ul-haq", "%bhai", "%nath", "%ah", "%im", "%uddin", "%mir", "%shah", "%khan", "%far", "%malik", "%xi", "%xu", "%yama", "%hama", "%moto", "%sawa", "%rrez", "%dela", "%loza", "%villa"]));
    }
    if (!getBioBanList()?.length) {
        localStorage.setItem("archiveBios", JSON.stringify(["Student", "India"]));
    }
}