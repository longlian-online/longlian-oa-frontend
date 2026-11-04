import { organizationProjectsQuery } from "@/queries/organizationAdmin";

import { organizationKeywordListLoader } from "./keywordListLoader";

export const loader = organizationKeywordListLoader(organizationProjectsQuery);
