import EventManager from './EventManager'

export default class GalleryModal {
    private $css: JQuery;
    private readonly select_class: string;
    private event: EventManager;
    private template: string;
    private readonly $modal: any;
    private options: any;

    constructor(options: any) {
        this.options = $.extend({
            // load more data on modal scroll
            loadOnScroll: false,

            // modal max height
            maxHeight: 500,

            // modal title
            title: 'Campaign gallery',

            // close button text
            close_text: 'Close',

            // save button text
            ok_text: 'Add',

            // select all button text
            selectAll_text: 'Select all',

            // deselect all button text
            deselectAll_text: 'Deselect all',

            // message error to display when no image is selected
            noImageSelected_msg: 'One image at least must be selected.'
        }, options);

        this.event = new EventManager();

        this.template = this.getModalTemplate();
        this.$modal = $(this.template).hide();

        // class to add to image when selected
        this.select_class = "selected-img";

        this.addStyleToDom();
        this.setOptions();

        this.attachEvents();
    }

    setOptions() {
        this.$modal.find('.modal-body').css('max-height', this.options.maxHeight);
        this.$modal.find('.modal-title').html(this.options.title);
        this.$modal.find('#close').html(this.options.close_text);
        this.$modal.find('#save').html(this.options.ok_text);
        this.$modal.find('#select-all').html(this.options.selectAll_text);
        this.$modal.find('#deselect-all').html(this.options.deselectAll_text);
    }

    // append images to the modal with data object
    addImages(data: any, page: any) {

        var $page_images = this.createImages(data, page);
        var $images_list = this.$modal.find('.images-list');

        if ($images_list.find('.img-item').length) {
            this.$modal.find('.images-list').append($page_images);
        } else {
            this.$modal.find('.images-list').html($page_images);
        }
    }

    // generate image elements from data object
    createImages(data: any, page: any) {
        var _this = this;
        let content = []

        for (var i = 0; i < data.length; i++) {

            // If we're working with a folder, different stuff going on
            if (data[i].folder) {
                $image = $('<div class="img-thumbnail grow flex flex-col justify-center items-center gap-2 cursor-pointer " title="' + data[i].title + '" data-url="' + data[i].url + '"/>');
                $image.html('<i class="' + data[i].icon + ' fa-2x" aria-hidden="true"></i>' + data[i].title + '</span>');

                $image.on('click', function (event) {
                    _this.loadFolder($(this).data('url'));
                });

                $item = $('<div class="w-32 h-32 rounded bg-base-200 img-item shadow-sm hover:shadow-xl flex flex-stretch">' + '</div>');
                $item.prepend($image);
                content.push($item);

                continue;
            }

            var $image = $('<img class="img-thumbnail sng-image rounded " title="'+ data[i].title +'" data-page="' + page + '"/>');

            $image.get(0).onload = function() {
                $(this).siblings('.loading').hide()
                $(this).on('click',function(event) {
                    $(this).toggleClass(_this.select_class);
                });
            }

            $image.attr('src', data[i].thumb);
            $image.data('gallery-id', data[i].id);
            $image.data('full', data[i].src);

            var $item = $('<div class="rounded w-32 h-32 cursor-pointer img-item shadow-sm hover:shadow-md hover:bg-base-200 flex justify-center items-center relative">'
                            +'<i class="fa-solid fa-check fa-check absolute bottom-4 right-4 text-xl drop-shadow" aria-hidden="true"></i>'
                            +'<span class="loading">'
                                +'<i class="fa-solid fa-spinner fa-pulse fa-3x fa-fw"></i>'
                            +'</span>'
                        +'</div>');

            $item.prepend($image);
            content.push($item)
        }

        return content;
    }

    showError(message_text: any, permanent: any = false) {
        var $message = this.$modal.find('.message');

        $message.html('<span class="alert alert-danger">' + message_text + '</span>');

        if (!permanent) {
            setTimeout(function () {
                $message.html('');
            }, 5000);
        }
    }

    showLoading () {
        this.$modal.find('.modal-footer .loading').show();
    }

    hideLoading () {
        this.$modal.find('.modal-footer .loading').hide();
    }

    attachEvents() {
        var _this = this;
        var $modal = this.$modal;
        var $modal_body = $modal.find('.modal-body');

        $modal.find("button#save").click(function(event: any) {
            var $selected_img = $modal.find('.img-item img.' + _this.select_class);

            if (! $selected_img.length) {
                _this.showError(_this.options.noImageSelected_msg);
                return;
            }

            $modal.modal('hide')

            _this.event.trigger('beforeSave', [_this]);

            $selected_img.each(function(index: any, el: any) {
                _this.event.trigger('save', [_this, $(this)]);

                $(this).removeClass(_this.select_class);
            });

            _this.event.trigger('afterSave', [this]);
        });

        $modal.on('hidden.bs.modal', function () {
            _this.event.trigger('close')
        })

        $modal.find("button#select-all").click(function(event: any) {
            $modal.find('img').addClass(_this.select_class);
        });

        $modal.find("button#deselect-all").click(function(event: any) {
            $modal.find('img').removeClass(_this.select_class);
        });

        $modal_body.scroll(function() {
            var $images_list = $modal.find('.images-list');
            var is_near_bottom = $modal_body.scrollTop() + $modal_body.height() >= $images_list.height() - 100;

            if (is_near_bottom) {
                _this.event.trigger('scrollBottom', [_this]);
            }
        });
    }

    open() {
        this.$modal.modal();
    }

    clearContent() {
        // Reset the initial html
        this.$modal.find('.images-list').html('');
    }

    // whether the images' container has enough content to show the vertical scroll
    imagesContainerHasScroll() {
        var $images_container = this.$modal.find('.modal-body');
        var $images_list = $images_container.find('.images-list');

        return parseInt($images_list.height()) > parseInt($images_container.height());
    }

    getModalTemplate() {

        var bootsrap_version = parseInt(($ as any).fn.modal.Constructor.VERSION);
        var header_content = [
            '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
            '<h4 class="modal-title">[gallery title]</h4>'
        ];

        var modal_html = ''+
            '<div class="modal summernote-gallery fade" tabindex="-1" role="dialog">'
                + '<div class="modal-lg modal-dialog ">'
                    + '<div class="modal-content">'
                        + '<div class="modal-header">'
                            + (bootsrap_version == 3 ? header_content.join('') : header_content.reverse().join(''))
                        + '</div>'
                        + '<div class="modal-body">'
                            + '<div class="flex flex-wrap gap-5 images-list">'
                            + '</div>'
                        + '</div>'
                        + '<div class="modal-footer">'
                            + '<span style="display: none;position: absolute;left: 10px;bottom: 10px;" class="loading" >'
                                + '<i class="fa-solid fa-spinner fa-pulse fa-3x fa-fw"></i>'
                            + '</span >'
                            + '<span style="display: inline-block; margin-right: 50px;">'
                                + '<button type="button" id="deselect-all" class="btn btn-default">[Deselect-all]</button>'
                                + '<button type="button" id="select-all" class="btn btn-default">[select-all]</button>'
                            + '</span >'
                            + '<button type="button" id="close" class="btn btn-default" data-dismiss="modal">[Close]</button>'
                            + '<button type="button" id="save" class="btn btn-primary">[Add]</button>'
                            + '<span class="message" ></span >'
                        + '</div>'
                    + '</div>'
                + '</div>'
            + '</div>';

        return modal_html;
    }

    addStyleToDom() {
        this.$css = $('<style>'
                        +'.img-item .fa-check{'
                            +'color: hsl(var(--ac)/1);'
                        +'}'
                        +'.img-item .sng-image{'
                            /*+'min-height : 119.66px;'*/
                        +'}'
                        +'.img-item .loading{'
                            +'position: absolute;'
                            +'margin: auto;'
                            +'top: -20px;'
                            +'bottom: 0;'
                            +'display: block;'
                            +'left: 0;'
                            +'right: 0;'
                            +'width: 60px;'
                            +'height: 42px;'
                            +'text-align: center;'
                        +'}'
                        +'.modal.summernote-gallery .message{'
                            +'display: block;'
                            +'padding: 30px 0 20px 0;'
                        +'}'
                        +'.modal.summernote-gallery .message:empty{'
                            +'display: block;'
                            +'padding: 0px!important;'
                        +'}'
                        +'.modal.summernote-gallery .modal-body{'
                            +'overflow: scroll;'
                        +'}'
                        +'.img-item .fa-check{'
                            +'display : none;'
                        +'}'
                        +'.img-item .'+ this.select_class +' + .fa-check{'
                            +'display : block;'
                        +'}'
                        +'.'+ this.select_class +'{'
                            +'background-color: hsl(var(--a)/1);'
                        +'}'
                    +'</style>');
        this.$css.appendTo('body');
    }

    loadFolder(folder: any) {
        //console.log('loading folder', folder);
        var _this = this;

        this.clearContent();
        this.showLoading();

        _this.event.trigger('loadFolder', [_this, folder]);
    }
}