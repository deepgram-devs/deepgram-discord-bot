import {
  Attachment,
  HexColorString,
  Message,
  PartialMessage,
  ThreadChannel,
} from "discord.js";

import { ACTION } from "../events/action.types";

export type TransformPost = {
  id: string;
  name: string;
  archived: string;
  type: number;
  parentId: string;
  locked: boolean;
  archiveTimestamp: number;
  messageCount: number;
  memberCount: number;
  totalMessageSent: number;
  appliedTags: string[];
  createdAt: string;
  url: string;
  createdTimestamp: number;
  messages: TransformMessage[];
  deleted?: boolean;
};

export type TransformMessage = {
  id: string;
  channelId: string;
  guildId: string;
  createdTimestamp: number;
  type: number;
  system: boolean;
  content: string;
  pinned: boolean;
  tts: boolean;
  cleanContent: string;
  attachments: Attachment[];
  author: TransformUser;
  reactions: TransformMessageReaction[];
  url: string;
  deleted?: boolean;
};

export type TransformUser = {
  id: string;
  bot: boolean;
  system: boolean;
  username: string;
  discriminator: string;
  globalName: string;
  avatar: string | null;
  banner?: string | null;
  defaultAvatarURL: string;
  avatarDecoration: string | null;
  createdTimestamp: number;
  hexAccentColor?: HexColorString | null;
  displayName: string;
  tag: string;
  avatarDecorationURL: string | null; // call
  avatarURL: string | null; // call
  bannerURL: string | null; // call
};

export type TransformEmoji = {
  animated: boolean | null;
  name: string | null;
  id: string | null;
  identifier: string;
  imageURL: string | null;
};

export type TransformMessageReaction = {
  count: number;
  emoji: TransformEmoji;
  me: boolean;
  message: TransformMessage;
};

export type ThreadActionReturn = {
  [ACTION.THREAD_CREATE]: (thread: ThreadChannel) => TransformPost;
  [ACTION.THREAD_UPDATE]: (thread: ThreadChannel) => TransformPost;
  [ACTION.THREAD_DELETE]: (thread: ThreadChannel) => void;
};
/**
 *
 * @param {Message | PartialMessage} message - Transform Message to JSON.
 * @returns {TransformMessage} - Returns transformed Message.
 */
export const messageTransform = (message: Message | PartialMessage) => {
  const messageJson = message.toJSON() as TransformMessage;
  messageJson["url"] = message.url;
  // mSs.push(messageJson);
  messageJson.attachments = [];
  for (const [, attachmentValue] of message.attachments) {
    const attachmentJson = attachmentValue;
    messageJson.attachments.push(attachmentJson);
  }
  const messageAuthor = message.author;
  if (messageAuthor) {
    const messageAuthorJson = messageAuthor.toJSON() as TransformUser;
    const messageAuthorValue = {
      ...messageAuthorJson,
      avatarDecorationURL: messageAuthor.avatarDecorationURL(),
      avatarURL: messageAuthor.avatarURL(),
      bannerUrl: messageAuthor.bannerURL(),
    };
    messageJson.author = messageAuthorValue;
  }
  // Set to empty array same as attachments
  messageJson.reactions = [];
  for (const [, messageReactionValue] of message.reactions.cache) {
    const messageReactionJson =
      messageReactionValue.toJSON() as TransformMessageReaction;
    const messageReactionJsonEmoji = messageReactionJson["emoji"] || {};
    messageReactionJsonEmoji.imageURL = messageReactionValue.emoji.imageURL();
    messageJson.reactions.push(messageReactionJson);
  }
  return messageJson;
};

/**
 * @returns {ThreadActionReturn} Returns object which can used as per the action.
 */
export const threadAction = () => {
  return {
    [ACTION.THREAD_CREATE]: async (thread: ThreadChannel) => {
      const threadData = thread.toJSON() as TransformPost;
      threadData["url"] = thread.url;
      const customMessages = [];
      const messages = await thread.messages.fetch();
      for (const [, messageValue] of messages.entries()) {
        const messageJson = await messageTransform(messageValue);
        customMessages.push(messageJson);
      }
      threadData.messages = customMessages;
      return threadData;
    },
    [ACTION.THREAD_UPDATE]: async (thread: ThreadChannel) => {
      // Same as create
      const threadData = thread.toJSON() as TransformPost;
      const customMessages = [];
      const messages = await thread.messages.fetch();
      for (const [, messageValue] of messages.entries()) {
        const messageJson = await messageTransform(messageValue);
        customMessages.push(messageJson);
      }
      threadData.messages = customMessages;
      return threadData;
    },
    [ACTION.THREAD_DELETE]: async () => {
      // There is no attribute in ThreadChannel which says if thread is
      // deleted or not, means if we tried fetching messages from deleted
      // thread, it will throw error
    },
  };
};
