import { Directive, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[appDropTarget]'
})
export class DropTargetDirective {
    constructor() {
    }

    @Input()
    set appDropTarget(options: DropTargetOptions) {
        if (options) {
            this.options = options;
        }
    }

    @Output('appDrop') drop = new EventEmitter();

    private options: DropTargetOptions = {};

    @HostListener('dragenter', ['$event'])
    @HostListener('dragover', ['$event'])
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    @HostListener('drop', ['$event'])
    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.drop.next(event.dataTransfer);
    }
}

export interface DropTargetOptions {
    zone?: string;
}
