import { AnyThreadChannel } from "discord.js";
import { ExtendedClient } from "../interfaces/ExtendedClient";

export const sendToSupabase = async (
  action: string,
  bot: ExtendedClient,
  data: any
) => {
  console.log(action, bot, data);
};
