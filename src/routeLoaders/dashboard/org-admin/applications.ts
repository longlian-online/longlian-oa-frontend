import { organizationApplicationsQuery } from "@/queries/organizationAdmin";

import { organizationKeywordListLoader } from "./keywordListLoader";

export const loader = organizationKeywordListLoader(organizationApplicationsQuery);
