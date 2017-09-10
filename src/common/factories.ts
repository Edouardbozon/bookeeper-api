export const createResponse = (message: string) => {
    if (typeof message !== "string") message = message + "";
    return { message };
};
