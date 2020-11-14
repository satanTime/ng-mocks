import { core } from '@angular/compiler';
import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Injector,
  Provider,
  Query,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';

import { flatten } from '../common/core.helpers';
import { directiveResolver } from '../common/core.reflect';
import { AnyType, Type } from '../common/core.types';
import decorateInputs from '../common/decorate.inputs';
import decorateOutputs from '../common/decorate.outputs';
import decorateQueries from '../common/decorate.queries';
import { getMockedNgDefOf } from '../common/func.get-mocked-ng-def-of';
import { MockControlValueAccessor } from '../common/mock-control-value-accessor';
import { MockOf } from '../common/mock-of';
import ngMocksUniverse from '../common/ng-mocks-universe';
import mockServiceHelper from '../mock-service/helper';

import { MockedComponent } from './types';

export function MockComponents(...components: Array<Type<any>>): Array<Type<MockedComponent<any>>> {
  return components.map(component => MockComponent(component, undefined));
}

/**
 * @deprecated since version 10.0.0 and will be removed in 11.0.0
 * feel free to open a github issue to discuss an alternative solution.
 * https://github.com/ike18t/ng-mocks/issues
 */
export function MockComponent<TComponent>(
  component: Type<TComponent>,
  metaData: core.Directive
): Type<MockedComponent<TComponent>>;

/**
 * @see https://github.com/ike18t/ng-mocks#how-to-mock-a-component
 */
export function MockComponent<TComponent>(
  component: AnyType<TComponent>,
  metaData?: core.Directive
): Type<MockedComponent<TComponent>>;
export function MockComponent<TComponent>(
  component: Type<TComponent>,
  metaData?: core.Directive
): Type<MockedComponent<TComponent>> {
  // we are inside of an 'it'.
  // It's fine to to return a mock copy or to throw an exception if it wasn't replaced with its mock copy in TestBed.
  if ((getTestBed() as any)._instantiated) {
    try {
      return getMockedNgDefOf(component, 'c');
    } catch (error) {
      // looks like an in-test mock.
    }
  }
  if (ngMocksUniverse.flags.has('cacheComponent') && ngMocksUniverse.cacheDeclarations.has(component)) {
    return ngMocksUniverse.cacheDeclarations.get(component);
  }

  let meta: core.Directive | undefined = metaData;
  /* istanbul ignore else */
  if (!meta) {
    try {
      meta = directiveResolver.resolve(component);
    } catch (e) {
      /* istanbul ignore next */
      throw new Error('ng-mocks is not in JIT mode and cannot resolve declarations');
    }
  }
  const { exportAs, inputs, outputs, queries, selector, providers } = meta;

  let template = `<ng-content></ng-content>`;
  const viewChildRefs = new Map<string, string>();
  /* istanbul ignore else */
  if (queries) {
    const queriesKeys = Object.keys(queries);
    const templateQueries = queriesKeys
      .map((key: string) => {
        const query: Query = queries[key];
        if (query.isViewQuery) {
          return ''; // ignoring all internal @ViewChild.
        }
        if (typeof query.selector !== 'string') {
          return ''; // in case of a mock component, Type based selector doesn't work properly anyway.
        }
        viewChildRefs.set(query.selector, key);
        queries[`__mockView_${key}`] = new ViewChild(`__${query.selector}`, {
          read: ViewContainerRef,
          static: false,
        } as any);
        return `<div *ngIf="mockRender_${query.selector}" data-key="${query.selector}"><ng-template #__${query.selector}></ng-template></div>`;
      })
      .join('');
    if (templateQueries) {
      template = `
        ${template}
        ${templateQueries}
      `;
    }
  }

  const options: Component = {
    exportAs,
    providers: [
      {
        provide: component,
        useExisting: (() => {
          const value: Type<any> & { __ngMocksSkip?: boolean } = forwardRef(() => ComponentMock);
          value.__ngMocksSkip = true;
          return value;
        })(),
      },
    ],
    selector,
    template,
  };

  const resolutions = new Map();
  const resolveProvider = (def: Provider) => mockServiceHelper.resolveProvider(def, resolutions);

  let setNgValueAccessor: undefined | boolean;
  for (const providerDef of flatten(providers || [])) {
    const provide =
      providerDef && typeof providerDef === 'object' && providerDef.provide ? providerDef.provide : providerDef;
    if (options.providers && provide === NG_VALIDATORS) {
      options.providers.push({
        multi: true,
        provide,
        useExisting: (() => {
          const value: Type<any> & { __ngMocksSkip?: boolean } = forwardRef(() => ComponentMock);
          value.__ngMocksSkip = true;
          return value;
        })(),
      });
      continue;
    }
    if (setNgValueAccessor === undefined && options.providers && provide === NG_VALUE_ACCESSOR) {
      setNgValueAccessor = false;
      options.providers.push({
        multi: true,
        provide,
        useExisting: (() => {
          const value: Type<any> & { __ngMocksSkip?: boolean } = forwardRef(() => ComponentMock);
          value.__ngMocksSkip = true;
          return value;
        })(),
      });
      continue;
    }

    const mock = resolveProvider(providerDef);
    /* istanbul ignore else */
    if (options.providers && mock) {
      options.providers.push(mock);
    }
  }
  if (setNgValueAccessor === undefined) {
    setNgValueAccessor =
      mockServiceHelper.extractMethodsFromPrototype(component.prototype).indexOf('writeValue') !== -1;
  }

  const config = ngMocksUniverse.config.get(component);

  @Component(options)
  @MockOf(component, { outputs, setNgValueAccessor })
  class ComponentMock extends MockControlValueAccessor implements AfterContentInit {
    /* istanbul ignore next */
    constructor(changeDetector: ChangeDetectorRef, injector: Injector) {
      super(injector);
      this.__ngMocksInstall(changeDetector, injector);
    }

    public ngAfterContentInit(): void {
      if (!(this as any).__rendered && config && config.render) {
        for (const block of Object.keys(config.render)) {
          const { $implicit, variables } =
            config.render[block] !== true
              ? config.render[block]
              : {
                  $implicit: undefined,
                  variables: {},
                };
          (this as any).__render(block, $implicit, variables);
        }
        (this as any).__rendered = true;
      }
    }

    private __ngMocksInstall(changeDetector: ChangeDetectorRef, injector: Injector): void {
      // Providing method to hide any @ContentChild based on its selector.
      (this as any).__hide = (contentChildSelector: string) => {
        const key = viewChildRefs.get(contentChildSelector);
        if (key) {
          (this as any)[`mockRender_${contentChildSelector}`] = false;
          changeDetector.detectChanges();
        }
      };

      // Providing a method to render any @ContentChild based on its selector.
      (this as any).__render = (contentChildSelector: string, $implicit?: any, variables?: Record<keyof any, any>) => {
        const key = viewChildRefs.get(contentChildSelector);
        let templateRef: TemplateRef<any>;
        let viewContainer: ViewContainerRef;
        if (key) {
          (this as any)[`mockRender_${contentChildSelector}`] = true;
          changeDetector.detectChanges();
          viewContainer = (this as any)[`__mockView_${key}`];
          templateRef = (this as any)[key];
          if (viewContainer && templateRef) {
            viewContainer.clear();
            viewContainer.createEmbeddedView(templateRef, { ...variables, $implicit } as any);
            changeDetector.detectChanges();
          }
        }
      };
    }
  }

  /* istanbul ignore else */
  if (queries) {
    decorateInputs(ComponentMock, inputs, Object.keys(queries));
  }
  decorateOutputs(ComponentMock, outputs);
  decorateQueries(ComponentMock, queries);

  /* istanbul ignore else */
  if (ngMocksUniverse.flags.has('cacheComponent')) {
    ngMocksUniverse.cacheDeclarations.set(component, ComponentMock);
  }

  return ComponentMock as any;
}
