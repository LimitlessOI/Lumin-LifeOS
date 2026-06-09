export function antiPatternCheck(output) {
  return {
    outputId: output.id,
    compareAgainst: ['known_builder_antipatterns', 'fake_green', 'scope_expansion'],
    status: 'REVIEW_REQUIRED'
  };
}
