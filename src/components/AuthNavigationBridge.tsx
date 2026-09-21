import { useEffect } from "react";
import { useNavigate } from "react-router";

import { registerAuthNavigate } from "@/lib/authRedirect";

export default function AuthNavigationBridge() {
  const navigate = useNavigate();

  useEffect(
    () =>
      registerAuthNavigate((to, options) => {
        void navigate(to, options);
      }),
    [navigate],
  );

  return null;
}
