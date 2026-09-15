# Selenium Stub Layer (E2E Fixture)

A permissive, dependency-free stub of the `selenium` Python package, used by
the ADR-010 real-model E2E suite to execute a model-generated Selenium script
on a machine that has no selenium installed.

## What this proves — and what it does NOT prove

This scaffold exists for exactly one reason: the E2E can run a generated
script (imports such as `from selenium import webdriver`,
`selenium.webdriver.common.by.By`, `WebDriverWait`, `expected_conditions`,
and `selenium.common.exceptions`) through the existing Python execution path
and prove that **the generated control flow runs to completion** — every
import resolves, the script executes top to bottom, and exits cleanly.

It does **NOT** prove that the script drives a real browser. No browser is
launched, no DOM exists, no element is ever located, and every call is a
no-op that returns another permissive stub. A run that used this layer must
be recorded as **`stubbed`** in its artifacts, and must never be presented
as evidence of real browser automation.

## Activation

Plain `.py` files with no build step. The layer is activated by putting this
directory on `PYTHONPATH`:

```bash
PYTHONPATH=e2e/fixtures/stubs python3 generated_script.py
```

The E2E harness (`e2e/real-model.spec.ts`, Group B) wires this up by passing
`PYTHONPATH` through `ExecutionConfig.env` — the test process's own
environment is never mutated. Requires Python 3.10+. No third-party imports.
When activated, this stub shadows any real selenium installation (PYTHONPATH
precedes site-packages).

## Import hardening (`sitecustomize.py`)

Python automatically imports `sitecustomize.py` at interpreter startup when
this directory is on `PYTHONPATH`. It installs a meta-path finder at the
**END** of `sys.meta_path` that resolves `selenium` and ANY `selenium.*`
submodule which the explicit modules in this package do not provide — for
example `selenium.webdriver.chrome.service` — to a permissive module, so a
different model's import surface can never crash the run with
`ModuleNotFoundError`.

Because the finder is appended last, the explicit modules in this package
(and any real installed packages) always keep winning: the finder only
fabricates a module after every earlier finder failed to locate one. Modules
outside the covered roots are not fabricated — `import genuinely_missing`
still raises `ModuleNotFoundError` as usual.

The covered top-level module names come from `AEGIS_E2E_STUB_MODULES`
(comma-separated, default `selenium`); an empty value installs no finder at
all. A failed install never breaks interpreter startup: the worst case is
that uncovered imports raise `ModuleNotFoundError` again, which the
surrounding E2E run reports as an ordinary execution failure.

## Layout

| File | Contents |
|------|----------|
| `sitecustomize.py` | Auto-imported at startup when this directory is on `PYTHONPATH`; installs the last-resort meta-path finder described above |
| `selenium/__init__.py` | `Permissive` placeholder class and a module `__getattr__` that returns real submodules where they exist, otherwise a permissive stub |
| `selenium/webdriver/__init__.py` | `Chrome`, `Firefox` placeholder classes plus module `__getattr__` |
| `selenium/webdriver/common/__init__.py` | Package init with permissive `__getattr__` |
| `selenium/webdriver/common/by.py` | `By` with the real locator-strategy values (`ID`, `NAME`, `CSS_SELECTOR`, `XPATH`, `CLASS_NAME`, `TAG_NAME`, `LINK_TEXT`, `PARTIAL_LINK_TEXT`); unknown names resolve permissively |
| `selenium/webdriver/common/keys.py` | `Keys` with the real key values; unknown names resolve permissively |
| `selenium/webdriver/support/__init__.py` | Package init with permissive `__getattr__` |
| `selenium/webdriver/support/ui.py` | `WebDriverWait` whose `until` / `until_not` succeed immediately and return permissive stubs; unknown names (e.g. `Select`) resolve permissively |
| `selenium/webdriver/support/expected_conditions.py` | Module `__getattr__` returning callables for any condition name |
| `selenium/common/__init__.py` | Package init with permissive `__getattr__` |
| `selenium/common/exceptions.py` | Real `WebDriverException`, `TimeoutException`, `NoSuchElementException`, `ElementNotInteractableException`, `StaleElementReferenceException`; any other name dynamically becomes a cached `WebDriverException` subclass so `except SomeName:` works |

## Permissive semantics

The `Permissive` object (the base of `Chrome`, `Firefox`, `WebDriverWait`,
`By`, and `Keys`, and the return value of every stubbed call) supports:

- attribute access and calling with any arguments
- context managers (`with` blocks never suppress exceptions)
- iteration (yields zero items, so loops always terminate)
- `len()` (0), truthiness (true), membership (`in` → true), subscripting
- comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`) and arithmetic operators
- `str()`, `repr()`, `int()`, `float()`

Unknown API usage must not crash the script; it silently no-ops.

## Known limitations

- Modules fabricated by the `sitecustomize.py` finder (any `selenium.*`
  submodule not present in this scaffold) are permissive placeholders:
  attribute access and calls never crash, but they carry none of the real
  API's semantics, and exception-like names fabricated this way are not
  real exception classes — use `selenium.common.exceptions` for those.
- The finder covers only the top-level roots listed in
  `AEGIS_E2E_STUB_MODULES` (default `selenium`); anything else that is
  genuinely missing still raises `ModuleNotFoundError`.
- The stub launches no browser and validates nothing about the script's
  intent; it only demonstrates that the generated control flow completes.
