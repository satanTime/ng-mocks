import { LegacyControlValueAccessor } from '../common/mock-control-value-accessor';

export type MockedComponentSelector<T> =
  | [keyof T]
  | [keyof T, number]
  | [keyof T, number, number]
  | [keyof T, number, number, number]
  | [keyof T, number, number, number, number]
  | [keyof T, number, number, number, number, number]
  | [keyof T, number, number, number, number, number, number]
  | [keyof T, number, number, number, number, number, number, number]
  | [keyof T, number, number, number, number, number, number, number, number]
  | [keyof T, number, number, number, number, number, number, number, number, number]
  | [keyof T, number, number, number, number, number, number, number, number, number, number]
  | string;

export type MockedComponent<T> = T &
  LegacyControlValueAccessor & {
    /**
     * @deprecated use ngMocks.hide instead
     */
    __hide(contentChildSelector: MockedComponentSelector<T>): void;

    /**
     * @deprecated use ngMocks.render instead
     */
    __render(
      contentChildSelector: MockedComponentSelector<T>,
      $implicit?: any,
      variables?: Record<keyof any, any>,
    ): void;
  };
