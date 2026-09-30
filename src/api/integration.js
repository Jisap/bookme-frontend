import client from "./client";


export const getGoogleConnectUrl = () => client.get("/integrations/google/connect");