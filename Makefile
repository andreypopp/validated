.DELETE_ON_ERROR:

BIN           = ./node_modules/.bin
TESTS         = $(shell find src -path '*/__tests__/*-test.js')
SRC           = $(filter-out $(TESTS) $(FIXTURES), $(shell find src -name '*.js'))
LIB           = $(SRC:src/%=lib/%)
MOCHA_OPTS    = --require @babel/register

build: build-lib build-typings

build-lib::
	@$(MAKE) -j 8 $(LIB)

build-typings: $(SRC:src/%=lib/%.flow)

doctoc:
	@$(BIN)/doctoc --title '**Table of Contents**' ./README.md

build-silent::
	@$(MAKE) -s -j 8 $(LIB)

lint::
	@$(BIN)/eslint src

check::
	@$(BIN)/flow --show-all-errors src

test:: test-unit #test-doc - doctest is not up to date

test-unit::
	@$(BIN)/mocha $(MOCHA_OPTS) $(TESTS)

test-doc:: build-silent
	@$(BIN)/mocha $(MOCHA_OPTS) --compilers md:mocha-doctest ./README.md

ci-doc::
	@$(BIN)/mocha $(MOCHA_OPTS) --compilers md:mocha-doctest --watch ./README.md

ci-unit::
	@$(BIN)/mocha $(MOCHA_OPTS) --watch --watch-extensions json,md $(TESTS)

sloc::
	@$(BIN)/sloc -e __tests__ src

version-major version-minor version-patch:: lint check test
	@npm version $(@:version-%=%)

publish:: build
	@git push --tags origin HEAD:master
	@npm publish

clean::
	@rm -rf lib

lib/%.js: src/%.js
	@echo "Building $@"
	@mkdir -p $(@D)
	@$(BIN)/babel $(BABEL_OPTIONS) -o $@ $<

lib/json5.js.flow: src/json5.js.flow
	@echo "Building $@"
	@mkdir -p $(@D)
	@cp $< $@

lib/%.js.flow: src/%.js
	@echo "Building $@"
	@mkdir -p $(@D)
	@cp $< $@
