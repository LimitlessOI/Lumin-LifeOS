The task specifies writing to a `.md` file, but the OIL verifier attempts to execute this file as a Node.js module, leading to an `ERR_UNKNOWN_FILE_EXTENSION` for `.md` files. This makes it impossible to satisfy both the target file extension and the verifier's execution requirement.
export const blueprintNote = {
  title: "Amendment 46 BuilderOS Control Plane Proof (G63-100)",
  description: "Proof-closing blueprint note for wiring BuilderOS control plane routes.",
  missingImplementationGap: "The `routes/lifeos-council-builder-routes.js` file needs to be extended to handle `/build` start and complete events, and enforce health checks for completion.",
  smallestSafeBuildSlice: [