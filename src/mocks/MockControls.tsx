import { rememberMockIdentity } from "../auth/mockIdentity";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { scenarioSchema, roleSchema } from "../api/contracts";
import { request } from "../api/http";
import { Button } from "../components/ui/button";
const schema = z.object({
  scenario: scenarioSchema,
  role: roleSchema,
});
type Values = z.infer<typeof schema>;
export function MockControls() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { scenario: "normal", role: "admin" },
  });
  async function apply(values: Values) {
    setError("");
    try {
      await request("/__mock/scenario", z.object({ ok: z.boolean() }), {
        method: "POST",
        body: JSON.stringify(values),
      });
      rememberMockIdentity(values.role);
      await client.invalidateQueries();
    } catch {
      setError("Could not change the mock scenario.");
    }
  }
  async function restore() {
    setError("");
    try {
      await request("/__mock/reset", z.object({ ok: z.boolean() }), {
        method: "POST",
      });
      reset();
      rememberMockIdentity("admin");
      await client.invalidateQueries();
    } catch {
      setError("Could not reset the mock environment.");
    }
  }
  return (
    <details className="mock-controls">
      <summary>Development tools · scenarios & reset</summary>
      <form onSubmit={handleSubmit(apply)}>
        <label>
          Scenario
          <select {...register("scenario")}>
            <option value="normal">Normal</option>
            <option value="empty">Empty</option>
            <option value="unavailable">Service unavailable</option>
            <option value="stale">Stale data</option>
            <option value="export-failure">Export fails once</option>
            <option value="export-expired">Export download expired</option>
            <option value="upload-failure">Document upload failure</option>
            <option value="onboarding-changes">
              Review requests address document
            </option>
            <option value="onboarding-approved">
              Review approves submitted application
            </option>
            <option value="onboarding-rejected">
              Review rejects submitted application
            </option>
            <option value="account-provisioned">
              Provision pending account with zero balance
            </option>
            <option value="invitation-expired">
              Expire pending invitations
            </option>
            <option value="invitation-accepted">
              Accept one pending invitation
            </option>
            <option value="no-developer-access">
              Remove business sandbox entitlement
            </option>
            <option value="expired">Expired session</option>
            <option value="denied">Permission denied</option>
          </select>
        </label>
        <label>
          Mock identity
          <select {...register("role")}>
            <option value="admin">David · administrator fixture</option>
            <option value="finance">Michael · finance fixture</option>
            <option value="developer">Amina · developer fixture</option>
            <option value="viewer">Sarah · viewer fixture</option>
          </select>
        </label>
        <Button disabled={isSubmitting}>Apply scenario</Button>
        <Button type="button" variant="outline" onClick={() => void restore()}>
          Reset mock data
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
