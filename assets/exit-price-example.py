"""Standalone fictional example of an exit-bar timing mismatch.

This is a portfolio illustration, not Midas source or market data.
Run with Python 3; no packages or network access required.
"""

examples = [
    # label, previous bar's close, scheduled exit bar's open
    ("No price gap", 100, 100),
    ("Price gap", 100, 103),
]
for label, previous_close, exit_open in examples:
    prior_rule = previous_close
    reference_rule = exit_open
    difference = prior_rule != reference_rule
    print(f"{label}: prior rule {prior_rule}; exit-bar rule {reference_rule}; "
          f"{'disagreement' if difference else 'same result'}")
