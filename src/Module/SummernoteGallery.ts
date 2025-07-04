import GalleryModal from './GalleryModal'
import DataManager from './DataManager'

export default class SummernoteGallery {
    private options: any;
    private plugin_default_options: {};
    private editor: any;
    private editable: any;
    private context: any;
    private plugin_options: any;
    private modal: any;
    private data_manager: any;
    constructor(options: any) {
        this.options = $.extend({
            name: 'summernoteGallery',
            buttonLabel: '<i class="fa-solid fa-file-image"></i>',
            tooltip: 'summernoteGallery'
        }, options);

        this.plugin_default_options = {}
    }

    // set the focus to the last focused element in the editor
    recoverEditorFocus() {
        var last_focused_el = $(this.editor).data('last_focused_element');
        if(typeof last_focused_el !== "undefined") {
            var editor = this.editable;
            var range = document.createRange();
            var sel = window.getSelection();
            var cursor_position =  last_focused_el.length;

            range.setStart(last_focused_el, cursor_position);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            editor.focus();
        }
    }

    saveLastFocusedElement() {
        var focused_element: any = window.getSelection().focusNode;
        var parent = $(this.editable).get(0);
        if ($.contains(parent, focused_element)) {
            $(this.editor).data('last_focused_element', focused_element)
        }
    }

    attachEditorEvents() {
        var _this = this;

        $(this.editable).on('keypress, mousemove', function() {
            _this.saveLastFocusedElement();
        })

        $(this.editable).on('click', 'summernote-gallery-brick .delete', function () {
            // delete brick
        })

        $(this.editable).on('click', 'summernote-gallery-brick .edit', function () {
            let $brick = $(this).parents('summernote-gallery-brick');
            let data = $brick.data('brick'); // json

            _this.modal.open(data);
        })
    }

    initGallery(context: any) {
        this.context = context;
        this.editor = this.context.layoutInfo.note;
        this.editable = this.context.layoutInfo.editable;
        this.plugin_options = $.extend(
            this.plugin_default_options,
            this.context.options[this.options.name] || {}
        )

        this.modal = new GalleryModal(this.plugin_options.modal);
        this.data_manager = new DataManager(this.plugin_options.source);

        this.attachModalEvents();
        this.attachEditorEvents();
    }

    attachModalEvents() {
        var _this = this;

        this.modal.event.on('beforeSave', function (gallery_modal: any) {
            _this.recoverEditorFocus();
        });

        this.modal.event.on('save', function (gallery_modal: any, $image: any) {
            // add selected images to summernote editor
            _this.context.invoke(
                'editor.pasteHTML',
                '<img src="' + $image.data('full') + '" alt="' + ($image.attr('alt') || "") + '" data-gallery-id="' + ($image.data('gallery-id') || "") + '" />'
            );
        });

        this.modal.event.on('scrollBottom', function (gallery_modal: any) {
            if (_this.modal.options.loadOnScroll) {
                _this.data_manager.fetchNext();
            }
        });
        this.modal.event.on('loadFolder', function (random: any, folder: any) {
            _this.data_manager.fetchFolder(folder);
        });

        this.modal.event.on('close', function (gallery_modal: any) {
            _this.data_manager.init();
            _this.modal.clearContent();
        });

        this.modal.event.on('search', function (gallery_modal: any, query: string) {
            _this.data_manager.search(query);
        });
    }

    createButton() {
        var _this = this;

        var button = ($ as any).summernote.ui.button({
            className: 'w-100',
            contents: this.options.buttonLabel,
            tooltip: this.options.tooltip,
            click: function() {
                _this.openGallery();
            }
        });

        // create jQuery object from button instance.
        return button.render();
    }

    attachDataEvents() {
        var _this = this;

        this.data_manager.event
        .on('beforeFetch', function () {
            _this.modal.showLoading();
        })
        .on('fetch', function (data: any, page: any, link: any) {
            _this.modal.addImages(data, page);

            setTimeout(function () {
                if (_this.modal.options.loadOnScroll && !_this.modal.imagesContainerHasScroll()) {
                    // The loadOnScroll won't work if the images' container doesn't have the scroll displayed,
                    // so we need to keep loading the images until the scroll shows.
                    _this.data_manager.fetchNext();
                }
            }, 2000)
        })
        .on('afterFetch', function () {
            _this.modal.hideLoading();
        })
        .on('error', function (error: any) {
            _this.modal.showError(error, true);
        });
    }

    openGallery() {
        this.attachDataEvents();
        this.data_manager.fetchData();
        this.modal.open();
    }
}