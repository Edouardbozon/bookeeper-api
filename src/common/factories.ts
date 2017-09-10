export const format = (message: string): { message: string } => {
    if (typeof message !== "string") message = message + "";
    return { message };
};
