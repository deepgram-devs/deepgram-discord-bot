import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { ExtendedClient } from "./ExtendedClient";

export interface Command {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  run: (
    bot: ExtendedClient,
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
}
