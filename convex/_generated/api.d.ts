/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as advisorErrors from "../advisorErrors.js";
import type * as advisorModelResponse from "../advisorModelResponse.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as eventRecommendations from "../eventRecommendations.js";
import type * as eventUpsert from "../eventUpsert.js";
import type * as events from "../events.js";
import type * as locationKeys from "../locationKeys.js";
import type * as lumaEventDescription from "../lumaEventDescription.js";
import type * as lumaSync from "../lumaSync.js";
import type * as lumaSyncActions from "../lumaSyncActions.js";
import type * as profileFromUrl from "../profileFromUrl.js";
import type * as recommendationEvents from "../recommendationEvents.js";
import type * as sync from "../sync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  advisorErrors: typeof advisorErrors;
  advisorModelResponse: typeof advisorModelResponse;
  categories: typeof categories;
  crons: typeof crons;
  eventRecommendations: typeof eventRecommendations;
  eventUpsert: typeof eventUpsert;
  events: typeof events;
  locationKeys: typeof locationKeys;
  lumaEventDescription: typeof lumaEventDescription;
  lumaSync: typeof lumaSync;
  lumaSyncActions: typeof lumaSyncActions;
  profileFromUrl: typeof profileFromUrl;
  recommendationEvents: typeof recommendationEvents;
  sync: typeof sync;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
