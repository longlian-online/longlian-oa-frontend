import { organizationProjectTypesQuery } from "@/queries/organizationAdmin";

import { organizationKeywordListLoader } from "./keywordListLoader";

export const loader = organizationKeywordListLoader(organizationProjectTypesQuery);
