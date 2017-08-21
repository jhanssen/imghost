import { Component, ElementRef, Renderer, Input, OnInit, OnDestroy } from '@angular/core';

import { ModalService } from '../modal.service';

@Component({
    selector: 'app-modal',
    template: '<ng-content></ng-content>',
    styleUrls: ['./modal.component.css']
})

export class ModalComponent implements OnInit, OnDestroy {
    @Input() id: string;
    private body: HTMLBodyElement = undefined;

    constructor(private modalService: ModalService, private el: ElementRef, private renderer: Renderer) { }

    ngOnInit(): void {
        this.body = document.querySelector("body");

        // ensure id attribute exists
        if (!this.id) {
            console.error('modal must have an id');
            return;
        }

        // move element to bottom of page (just before </body>) so it can be displayed above everything else
        this.body.appendChild(this.el.nativeElement);

        // close modal on background click
        this.renderer.listen(this.el.nativeElement, 'click', (e: any) => {
            if (e.target.matches(".modal") || e.target.matches(".modal-background")) {
                this.close();
            }
        });

        // add self (this modal instance) to the modal service so it's accessible from controllers
        this.modalService.add(this);
    }

    // remove self from modal service when directive is destroyed
    ngOnDestroy(): void {
        this.modalService.remove(this.id);
        this.body.removeChild(this.el.nativeElement);
    }

    // open modal
    open(): void {
        this.el.nativeElement.style.display = "block";
        this.body.classList.add('modal-open');
    }

    // close modal
    close(): void {
        this.el.nativeElement.style.display = "none";
        this.body.classList.remove('modal-open');
    }
}
