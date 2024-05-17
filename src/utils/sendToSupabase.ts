import { createClient } from "@supabase/supabase-js";
import { AnyThreadChannel, Message, PartialMessage } from "discord.js";

import { Database } from "../database.types";
import { ACTION } from "../events/action.types";
import { ExtendedClient } from "../interfaces/ExtendedClient";

import {
  messageTransform,
  threadAction,
  TransformMessage,
  TransformPost,
} from "./transformers";

const timeZone = "America/New_York";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

/**
 *
 * @param {typeof ACTION} action - Create, update or delete.
 * @param {ExtendedClient} bot - Bot instance.
 * @param {AnyThreadChannel} thread - Thread instance.
 * @returns {any} - Any.
 */
export const sendThreadToSupabase = async (
  action: string,
  bot: ExtendedClient,
  thread: AnyThreadChannel
) => {
  switch (action) {
    case ACTION.THREAD_CREATE: {
      const threadData = await threadAction()[ACTION.THREAD_CREATE](thread);
      const threadJson = {
        raw: JSON.parse(JSON.stringify(threadData)),
        source: "discord",
        origin: threadData.id,
        created_at:
          thread.createdAt?.toLocaleString("en-US", { timeZone }) ||
          new Date().toLocaleString("en-US", { timeZone }),
      };
      const { data, error } = await supabase
        .from("community_raw")
        .insert([threadJson])
        .select();
      if (error) {
        return Promise.reject(error);
      }
      return data;
    }
    case ACTION.THREAD_UPDATE: {
      const threadData = await threadAction()[ACTION.THREAD_UPDATE](thread);
      const threadJson = {
        raw: JSON.parse(JSON.stringify(threadData)),
        source: "discord",
        origin: threadData.id,
        created_at:
          thread.createdAt?.toLocaleString("en-US", { timeZone }) ||
          new Date().toLocaleString("en-US", { timeZone }),
      };

      const { data, error } = await supabase
        .from("community_raw")
        .update({ ...threadJson })
        .eq("origin", threadData.id)
        .select();

      if (error) {
        return Promise.reject(error);
      }

      return data;
    }
    case ACTION.THREAD_DELETE: {
      const { data, error } = await supabase
        .from("community_raw")
        .select("*")
        .eq("origin", thread.id);

      if (data && data.length > 0) {
        const { raw, ...rest } = data[0];
        const deletedRawData = Object.assign(
          {},
          JSON.parse(JSON.stringify(raw)),
          // How to convert the JSON to object, what is this typescript error
          {
            deleted: true,
          }
        );

        const { data: deletedPost, error: deletePostError } = await supabase
          .from("community_raw")
          .update({ ...rest, raw: deletedRawData })
          .eq("origin", thread.id)
          .select();

        if (deletePostError) {
          return Promise.reject(deletePostError);
        }
        return deletedPost;
      }
      if (error) {
        return Promise.reject(error);
      }
      return;
    }
    default: {
      return;
    }
  }
};

/**
 *
 * @param {typeof ACTION} action - Create, update or delete.
 * @param {ExtendedClient} bot - Bot instance.
 * @param {Message} message - Message instance.
 * @returns {any} - Any.
 */
export const sendMessageToSupabase = async (
  action: string,
  bot: ExtendedClient,
  message: Message | PartialMessage
) => {
  switch (action) {
    case ACTION.MESSAGE_CREATE: {
      const threadId = message.channel.id;
      if (threadId) {
        const { data: threadData, error } = await supabase
          .from("community_raw")
          .select("*")
          .eq("origin", threadId);
        if (error) {
          return Promise.reject(error);
        }
        if (threadData && threadData.length > 0) {
          const { raw } = threadData[0];
          let { messages = [] } = JSON.parse(
            JSON.stringify(raw)
          ) as TransformPost;
          const transformedMessage = messageTransform(message);
          let found = false;
          messages = messages.reduce(
            (msgs: TransformMessage[], m: TransformMessage) => {
              if (m.id === transformedMessage.id) {
                found = true;
                msgs.push({ ...transformedMessage });
              } else {
                msgs.push(m);
              }
              return msgs;
            },
            []
          );
          if (!found) {
            messages.push(transformedMessage);
            const { data: updatedPost, error: createMessageError } =
              await supabase
                .from("community_raw")
                .update({ raw: Object.assign({}, raw, { messages }) })
                .eq("origin", threadId)
                .select();
            if (createMessageError) {
              return Promise.reject(createMessageError);
            }
            return updatedPost;
          }
        }
      }
      return Promise.reject("Message doesn't belong to helpChannel");
    }
    case ACTION.MESSAGE_UPDATE: {
      // Same as message create, let it be repeating
      // we never know what to add in future
      const threadId = message.channel.id;
      if (threadId) {
        const { data: threadData, error } = await supabase
          .from("community_raw")
          .select("*")
          .eq("origin", threadId);
        if (error) {
          return Promise.reject(error);
        }
        if (threadData && threadData.length > 0) {
          const { raw } = threadData[0];
          let { messages } = JSON.parse(JSON.stringify(raw)) as TransformPost;
          const transformedMessage = messageTransform(message);
          let found = false;
          messages = messages.reduce(
            (msgs: TransformMessage[], m: TransformMessage) => {
              if (m.id === transformedMessage.id) {
                found = true;
                // Transformed message can be partial, so we need the
                // current values of message from raw
                msgs.push({ ...m, ...transformedMessage });
              } else {
                msgs.push(m);
              }
              return msgs;
            },
            []
          );
          if (!found) {
            messages.push(transformedMessage);
            const { data: updatedPost, error: createMessageError } =
              await supabase
                .from("community_raw")
                .update({ raw: Object.assign({}, raw, { messages }) })
                .eq("origin", threadId)
                .select();
            if (createMessageError) {
              return Promise.reject(createMessageError);
            }
            return updatedPost;
          }
        }
      }
      return Promise.reject("Message doesn't belong to helpChannel");
    }
    case ACTION.MESSAGE_DELETE: {
      const threadId = message.channel.id;
      if (threadId) {
        const { data: threadData, error } = await supabase
          .from("community_raw")
          .select("*")
          .eq("origin", threadId);
        if (error) {
          return Promise.reject(error);
        }
        if (threadData && threadData.length > 0) {
          const { raw } = threadData[0];
          let { messages } = JSON.parse(JSON.stringify(raw)) as TransformPost;
          const transformedMessage = messageTransform(message);
          messages = messages.reduce(
            (msgs: TransformMessage[], m: TransformMessage) => {
              if (m.id === transformedMessage.id) {
                // Transformed message can be partial, so we need the
                // current values of message from raw
                msgs.push({ ...m, ...transformedMessage, deleted: true });
              } else {
                msgs.push(m);
              }
              return msgs;
            },
            []
          );
          const { data: updatedPost, error: createMessageError } =
            await supabase
              .from("community_raw")
              .update({ raw: Object.assign({}, raw, { messages }) })
              .eq("origin", threadId)
              .select();
          if (createMessageError) {
            return Promise.reject(createMessageError);
          }
          return updatedPost;
        }
      }
      return Promise.reject("Message doesn't belong to helpChannel");
    }
    default: {
      return;
    }
  }
};
