"use client";
import { memo, useCallback, useId, useRef } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import hardenReactMarkdownImport from "harden-react-markdown";
import type { BundledTheme } from "shiki";
import {
  useMarkdownBlockByIndex,
  useMarkdownStore,
} from "@/lib/stores/hooks-markdown";
import type { MarkdownMemoAugmentedState } from "@/lib/stores/with-markdown-memo";
import type { ChatMessage } from "@/lib/ai/types";
import { ShikiThemeContext } from "./index";
import { components as defaultComponents } from "./lib/components";
import { cn } from "./lib/utils";

type HardenReactMarkdownProps = Options & {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
};

// Handle both ESM and CJS imports
const hardenReactMarkdown =
  (
    hardenReactMarkdownImport as unknown as {
      default?: typeof hardenReactMarkdownImport;
    }
  ).default || hardenReactMarkdownImport;

// Create a hardened version of ReactMarkdown
const HardenedMarkdown: ReturnType<typeof hardenReactMarkdown> =
  hardenReactMarkdown(ReactMarkdown);

export type StreamdownProps = HardenReactMarkdownProps & {
  parseIncompleteMarkdown?: boolean;
  className?: string;
  shikiTheme?: [BundledTheme, BundledTheme];
};

type BlockProps = HardenReactMarkdownProps & {
  messageId: string;
  partIdx: number;
  index: number;
};
const Block = memo(
  ({ messageId, partIdx, index, ...props }: BlockProps) => {
    const block = useMarkdownBlockByIndex(messageId, partIdx, index);
    if (block === null || block.trim() === "") {
      return null;
    }

    return <HardenedMarkdown {...props}>{block}</HardenedMarkdown>;
  },
  (prev, next) =>
    prev.messageId === next.messageId &&
    prev.partIdx === next.partIdx &&
    prev.index === next.index
);

Block.displayName = "Block";

export const Streamdown = memo(
  ({
    messageId,
    partIdx,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    components,
    rehypePlugins,
    remarkPlugins,
    className,
    shikiTheme = ["github-light", "github-dark"],

    ...props
  }: StreamdownProps & { messageId: string; partIdx: number }) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const generatedId = useId();

    // Use a custom selector to get the exact number of blocks, bypassing the store's preallocation logic.
    // This optimization prevents rendering 100 empty block components.
    const realBlockCount = useMarkdownStore(
      useCallback(
        (state: MarkdownMemoAugmentedState<ChatMessage>) => {
          try {
             const blocks = state.getMarkdownBlocksForPart(messageId, partIdx);
             return blocks.length;
          } catch (e) {
             return 0;
          }
        },
        [messageId, partIdx]
      )
    );

    // Use a ref to store the block count. While simply using realBlockCount works,
    // a ref can be useful if we implement debouncing or stability checks in the future.
    // Currently, we sync it to allow for updates (including decreases on edit/reset).
    const blockCountRef = useRef(0);
    blockCountRef.current = realBlockCount;
    const blockCount = blockCountRef.current;

    return (
      <ShikiThemeContext.Provider value={shikiTheme}>
        <div className={cn("space-y-4", className)} {...props}>
          {Array.from({ length: blockCount }, (_, index) => index).map(
            (index) => (
              <Block
                allowedImagePrefixes={allowedImagePrefixes ?? ["*"]}
                allowedLinkPrefixes={allowedLinkPrefixes ?? ["*"]}
                components={{
                  ...defaultComponents,
                  ...components,
                }}
                defaultOrigin={defaultOrigin}
                index={index}
                key={`${generatedId}-block_${index}`}
                messageId={messageId}
                partIdx={partIdx}
                rehypePlugins={[rehypeKatex, ...(rehypePlugins ?? [])]}
                remarkPlugins={[
                  remarkGfm,
                  remarkMath,
                  ...(remarkPlugins ?? []),
                ]}
              />
            )
          )}
        </div>
      </ShikiThemeContext.Provider>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
Streamdown.displayName = "Streamdown";

export default Streamdown;
