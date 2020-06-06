import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockedDebugElement, MockRender, ngMocks } from 'ng-mocks';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'item-list',
  template: '{{items.length}}',
})
export class ItemListComponent {
  @Input() items: string[];
}

@Component({
  selector: 'item-list-wrapper',
  template: '<item-list [items]="items"></item-list>',
})
export class ItemListWrapperComponent {
  @Input() items: string[];
}

describe('ChangeDetectionStrategy.OnPush:real', () => {
  let wrapper: ComponentFixture<ItemListWrapperComponent>;
  let componentDebugElement: MockedDebugElement;

  beforeEach(() => {
    // const wrapperType = WrapComponent(ItemListComponent);
    TestBed.configureTestingModule({
      declarations: [
        ItemListComponent,
        ItemListWrapperComponent,
        // wrapperType,
      ],
    });

    wrapper = TestBed.createComponent(ItemListWrapperComponent);
    wrapper.componentInstance.items = [];
    wrapper.detectChanges();

    componentDebugElement = ngMocks.find(wrapper.debugElement, ItemListComponent);
  });

  it('should show 0 if no items', () => {
    expect(componentDebugElement.nativeElement.innerHTML).toEqual('0');
  });

  it('should show 0 if items pushed to array but not changed reference', () => {
    wrapper.componentInstance.items.push('demo');
    wrapper.detectChanges();

    expect(componentDebugElement.nativeElement.innerHTML).toEqual('0');
  });

  it('should show 1 if items array changed reference', () => {
    wrapper.componentInstance.items = ['demo'];
    wrapper.detectChanges();

    expect(componentDebugElement.nativeElement.innerHTML).toEqual('1');
  });
});

describe('ChangeDetectionStrategy.OnPush:mock', () => {
  let fixture: ComponentFixture<ItemListComponent>;
  let component: ItemListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ItemListComponent],
    });

    fixture = MockRender(ItemListComponent, {
      items: [],
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show 0 if no items', () => {
    expect(fixture.nativeElement.innerHTML).toContain('>0<');
  });

  it('should show 0 if items pushed to array but not changed reference', () => {
    component.items.push('demo');
    fixture.detectChanges();

    expect(fixture.nativeElement.innerHTML).toContain('>0<');
  });

  it('should show 1 if items array changed reference', () => {
    component.items = ['demo'];
    fixture.detectChanges();

    expect(fixture.nativeElement.innerHTML).toContain('>1<');
  });
});
