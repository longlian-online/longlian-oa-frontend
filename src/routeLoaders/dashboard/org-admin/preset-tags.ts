import { organizationPresetTagsQuery } from "@/queries/organizationAdmin";

import { organizationKeywordListLoader } from "./keywordListLoader";

export const loader = organizationKeywordListLoader(organizationPresetTagsQuery);
