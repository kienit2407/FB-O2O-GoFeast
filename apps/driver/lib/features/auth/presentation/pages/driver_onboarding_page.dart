import 'dart:io';

import 'package:driver/app/theme/app_color.dart';
import 'package:driver/core/di/providers.dart';
import 'package:driver/features/auth/data/models/driver_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

class DriverOnboardingPage extends ConsumerStatefulWidget {
  const DriverOnboardingPage({super.key});

  @override
  ConsumerState<DriverOnboardingPage> createState() =>
      _DriverOnboardingPageState();
}

class _DriverOnboardingPageState extends ConsumerState<DriverOnboardingPage> {
  static const int _totalSteps = 6;

  int _step = 0;
  bool _saving = false;

  late final PageController _pc;
  final ImagePicker _picker = ImagePicker();
  final _phoneCtrl = TextEditingController();
  final _idCardCtrl = TextEditingController();
  final _vehicleBrandCtrl = TextEditingController();
  final _licenseNoCtrl = TextEditingController();
  String? _licenseType;
  DateTime? _licenseExpiry;

  String? _vehicleBrand;
  final _vehicleModelCtrl = TextEditingController();
  final _vehiclePlateCtrl = TextEditingController();
  bool _didPrefill = false;

  String? _avatarUrl;
  File? _avatarFile;

  String? _idFrontUrl;
  String? _idBackUrl;
  String? _licenseImgUrl;
  String? _vehicleImgUrl;

  File? _idFrontFile;
  File? _idBackFile;
  File? _licenseFile;
  File? _vehicleFile;

  static const _licenseTypes = ['A1', 'A2', 'B1', 'B2'];
  static const _vehicleBrands = [
    'Honda',
    'Yamaha',
    'Suzuki',
    'Kawasaki',
    'VinFast',
    'Khác',
  ];

  @override
  void initState() {
    super.initState();
    _pc = PageController(initialPage: 0);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final me = ref.read(driverAuthControllerProvider).me;
      final p = me?.driverProfile;

      if (me?.phone != null) _phoneCtrl.text = me!.phone!;
      if (p == null) return;

      _idCardCtrl.text = p.idCardNumber ?? '';
      _idFrontUrl = p.idCardFrontUrl;
      _idBackUrl = p.idCardBackUrl;

      _licenseNoCtrl.text = p.licenseNumber ?? '';
      _licenseType = p.licenseType;
      _licenseImgUrl = p.licenseImageUrl;
      _licenseExpiry = p.licenseExpiry;

      _vehicleBrand = p.vehicleBrand;
      _vehicleBrandCtrl.text = p.vehicleBrand ?? '';
      _vehicleModelCtrl.text = p.vehicleModel ?? '';
      _vehiclePlateCtrl.text = p.vehiclePlate ?? '';
      _vehicleImgUrl = p.vehicleImageUrl;

      setState(() {});
    });
  }

  @override
  void dispose() {
    _pc.dispose();
    _phoneCtrl.dispose();
    _idCardCtrl.dispose();
    _licenseNoCtrl.dispose();
    _vehicleModelCtrl.dispose();
    _vehiclePlateCtrl.dispose();
    _vehicleBrandCtrl.dispose();
    super.dispose();
  }

  void _prefillFromMe(DriverMe me) {
    if (_didPrefill) return;
    _didPrefill = true;

    final p = me.driverProfile;

    if (me.phone != null) _phoneCtrl.text = me.phone!;
    _avatarUrl = me.avatarUrl;

    if (p == null) {
      if (mounted) setState(() {});
      return;
    }

    _idCardCtrl.text = p.idCardNumber ?? '';
    _idFrontUrl = p.idCardFrontUrl;
    _idBackUrl = p.idCardBackUrl;

    _licenseNoCtrl.text = p.licenseNumber ?? '';
    _licenseType = p.licenseType;
    _licenseImgUrl = p.licenseImageUrl;
    _licenseExpiry = p.licenseExpiry;

    _vehicleBrand = p.vehicleBrand;
    _vehicleModelCtrl.text = p.vehicleModel ?? '';
    _vehiclePlateCtrl.text = p.vehiclePlate ?? '';
    _vehicleImgUrl = p.vehicleImageUrl;

    if (mounted) setState(() {});
  }

  void _gotoStep(int s) {
    final next = s.clamp(0, _totalSteps - 1);
    setState(() => _step = next);
    _pc.animateToPage(
      next,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColor.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  bool _hasFileOrUrl(File? f, String? url) =>
      f != null || (url?.isNotEmpty ?? false);

  bool _validateStep(int step) {
    if (step == 0) return _phoneCtrl.text.trim().isNotEmpty;

    if (step == 1) {
      return _idCardCtrl.text.trim().isNotEmpty &&
          _hasFileOrUrl(_idFrontFile, _idFrontUrl) &&
          _hasFileOrUrl(_idBackFile, _idBackUrl);
    }

    if (step == 2) {
      return _licenseNoCtrl.text.trim().isNotEmpty &&
          (_licenseType != null) &&
          _hasFileOrUrl(_licenseFile, _licenseImgUrl) &&
          (_licenseExpiry != null);
    }

    if (step == 3) {
      return (_vehicleBrand?.trim().isNotEmpty ?? false) &&
          _vehicleModelCtrl.text.trim().isNotEmpty &&
          _vehiclePlateCtrl.text.trim().isNotEmpty &&
          _hasFileOrUrl(_vehicleFile, _vehicleImgUrl);
    }

    if (step == 4) {
      return _hasFileOrUrl(_avatarFile, _avatarUrl);
    }

    return true;
  }

  Future<void> _pickToLocal({
    required Future<File?> Function() pickFn,
    required void Function(File f) setFile,
  }) async {
    try {
      debugPrint('UPLOAD BOX TAP ✅');
      final file = await pickFn();
      if (file == null) {
        _showSnack('Bạn chưa chọn ảnh');
        return;
      }
      setFile(file);
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('PICK ERROR: $e');
      _showSnack('Chọn ảnh thất bại: $e');
    }
  }

  Future<void> _next() async {
    if (_saving) return;

    if (!_validateStep(_step)) {
      _showSnack('Vui lòng nhập đủ thông tin của bước này');
      return;
    }

    if (_step < _totalSteps - 1) {
      _gotoStep(_step + 1);
    }
  }

  void _back() {
    if (_saving) return;
    if (_step == 0) return;
    _gotoStep(_step - 1);
  }

  Future<void> _submit() async {
    if (_saving) return;

    for (int s = 0; s <= 4; s++) {
      if (!_validateStep(s)) {
        _showSnack('Bạn đang thiếu thông tin ở bước ${s + 1}');
        _gotoStep(s);
        return;
      }
    }

    setState(() => _saving = true);
    try {
      final vm = ref.read(driverAuthControllerProvider.notifier);

      final fields = {
        'phone': _phoneCtrl.text.trim(),
        'idCardNumber': _idCardCtrl.text.trim(),
        'licenseNumber': _licenseNoCtrl.text.trim(),
        'licenseType': _licenseType,
        'licenseExpiry': _licenseExpiry!.toIso8601String(),
        'vehicleBrand': _vehicleBrand,
        'vehicleModel': _vehicleModelCtrl.text.trim(),
        'vehiclePlate': _vehiclePlateCtrl.text.trim(),
      };

      await vm.submitMultipart(
        fields: fields,
        idCardFront: _idFrontFile,
        idCardBack: _idBackFile,
        licenseImage: _licenseFile,
        vehicleImage: _vehicleFile,
        avatarImage: _avatarFile,
        idCardFrontUrl: _idFrontUrl,
        idCardBackUrl: _idBackUrl,
        licenseImageUrl: _licenseImgUrl,
        vehicleImageUrl: _vehicleImgUrl,
        avatarUrl: _avatarUrl,
      );

      if (!mounted) return;
      context.go('/pending');
    } catch (e) {
      _showSnack('Nộp hồ sơ thất bại: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<File?> _pickFromCameraAndCrop({CropAspectRatio? ratio}) async {
    final cam = await Permission.camera.request();
    if (!cam.isGranted) return null;

    final picked = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 90,
    );
    if (picked == null) return null;

    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
      compressQuality: 90,
      aspectRatio: ratio,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Cắt ảnh',
          lockAspectRatio: ratio != null,
        ),
        IOSUiSettings(title: 'Cắt ảnh'),
      ],
    );
    if (cropped == null) return null;
    return File(cropped.path);
  }

  Future<File?> _pickFromGalleryAndCrop({CropAspectRatio? ratio}) async {
    try {
      debugPrint('PICK: open gallery...');
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 90,
      );

      debugPrint('PICK: result = ${picked?.path}');
      if (picked == null) return null;

      final cropped = await ImageCropper().cropImage(
        sourcePath: picked.path,
        compressQuality: 90,
        aspectRatio: ratio,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Cắt ảnh',
            lockAspectRatio: ratio != null,
          ),
          IOSUiSettings(title: 'Cắt ảnh'),
        ],
      );

      debugPrint('CROP: result = ${cropped?.path}');
      if (cropped == null) return null;

      return File(cropped.path);
    } catch (e, st) {
      debugPrint('PICK ERROR: $e\n$st');
      rethrow;
    }
  }

  Future<void> _uploadToField({
    required String type,
    required Future<File?> Function() pickFn,
    required void Function(bool) setLoading,
    required void Function(String url) setUrl,
  }) async {
    try {
      setLoading(true);

      final file = await pickFn();
      if (file == null) return;

      final url = await ref
          .read(driverAuthControllerProvider.notifier)
          .uploadImage(file: file, folder: type);

      setUrl(url);
      if (mounted) setState(() {});
    } catch (e) {
      _showSnack('Upload thất bại: $e');
    } finally {
      setLoading(false);
      if (mounted) setState(() {});
    }
  }

  Future<void> _pickLicenseExpiry() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _licenseExpiry ?? now,
      firstDate: now.subtract(const Duration(days: 365 * 20)),
      lastDate: now.add(const Duration(days: 365 * 20)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColor.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppColor.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked == null) return;
    setState(() => _licenseExpiry = picked);
  }

  InputDecoration _decor({
    required String label,
    String? hint,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppColor.surfaceWarm,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      labelStyle: const TextStyle(
        color: AppColor.textSecondary,
        fontWeight: FontWeight.w500,
        fontSize: 12,
      ),
      hintStyle: const TextStyle(color: AppColor.textMuted, fontSize: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColor.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColor.primary, width: 1.4),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColor.border),
      ),
    );
  }

  Widget _screenPhone() {
    return _StepScaffold(
      title: 'Bước 1/6',
      headline: 'Số điện thoại',
      description: 'Nhập số điện thoại để liên hệ và xác thực hồ sơ.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            cursorColor: AppColor.info,
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: _decor(
              label: 'Số điện thoại',
              hint: 'Nhập số điện thoại',
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _screenIdCard() {
    return _StepScaffold(
      title: 'Bước 2/6',
      headline: 'Căn cước công dân (CCCD)',
      description: 'Nhập số CCCD và chụp ảnh mặt trước/mặt sau.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _idCardCtrl,
            decoration: _decor(label: 'Số CCCD', hint: 'Nhập số CCCD'),
          ),
          const SizedBox(height: 14),
          _UploadBox(
            label: 'Mặt trước CCCD (chọn từ thư viện)',
            url: _idFrontUrl,
            file: _idFrontFile,
            loading: false,
            onTap: () => _pickToLocal(
              pickFn: () => _pickFromGalleryAndCrop(
                ratio: const CropAspectRatio(ratioX: 3, ratioY: 2),
              ),
              setFile: (f) => _idFrontFile = f,
            ),
          ),
          const SizedBox(height: 12),
          _UploadBox(
            label: 'Mặt sau CCCD (chọn từ thư viện)',
            url: _idBackUrl,
            file: _idBackFile,
            loading: false,
            onTap: () => _pickToLocal(
              pickFn: () => _pickFromGalleryAndCrop(
                ratio: const CropAspectRatio(ratioX: 3, ratioY: 2),
              ),
              setFile: (f) => _idBackFile = f,
            ),
          ),
        ],
      ),
    );
  }

  Widget _screenLicense() {
    return _StepScaffold(
      title: 'Bước 3/6',
      headline: 'Giấy phép lái xe (GPLX)',
      description: 'Nhập thông tin GPLX, ngày hết hạn và chụp ảnh GPLX.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _licenseNoCtrl,
            decoration: _decor(label: 'Số GPLX'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _licenseType,
            items: _licenseTypes
                .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                .toList(),
            onChanged: (v) => setState(() => _licenseType = v),
            decoration: _decor(label: 'Hạng GPLX'),
            dropdownColor: Colors.white,
            borderRadius: BorderRadius.circular(16),
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pickLicenseExpiry,
            borderRadius: BorderRadius.circular(16),
            child: InputDecorator(
              decoration: _decor(
                label: 'Ngày hết hạn',
                suffixIcon: const Icon(
                  Icons.calendar_month_rounded,
                  color: AppColor.primary,
                ),
              ),
              child: Text(
                _licenseExpiry == null
                    ? 'Chọn ngày'
                    : _licenseExpiry!.toLocal().toString().split(' ').first,
                style: TextStyle(
                  color: _licenseExpiry == null
                      ? AppColor.textMuted
                      : AppColor.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _UploadBox(
            label: 'Ảnh GPLX (chọn từ thư viện)',
            url: _licenseImgUrl,
            file: _licenseFile,
            loading: false,
            onTap: () => _pickToLocal(
              pickFn: () => _pickFromGalleryAndCrop(
                ratio: const CropAspectRatio(ratioX: 3, ratioY: 2),
              ),
              setFile: (f) => _licenseFile = f,
            ),
          ),
        ],
      ),
    );
  }

  Widget _screenVehicle() {
    return _StepScaffold(
      title: 'Bước 4/6',
      headline: 'Thông tin xe',
      description: 'Chọn hãng xe, nhập dòng xe, biển số và tải ảnh xe.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Autocomplete<String>(
            initialValue: TextEditingValue(text: _vehicleBrand ?? ''),
            optionsBuilder: (TextEditingValue textEditingValue) {
              final query = textEditingValue.text.trim().toLowerCase();

              if (query.isEmpty) {
                return _vehicleBrands;
              }

              return _vehicleBrands.where(
                (item) => item.toLowerCase().contains(query),
              );
            },
            onSelected: (value) {
              setState(() {
                _vehicleBrand = value;
                _vehicleBrandCtrl.text = value;
              });
            },
            fieldViewBuilder:
                (context, textEditingController, focusNode, onFieldSubmitted) {
                  if (textEditingController.text.isEmpty &&
                      _vehicleBrandCtrl.text.isNotEmpty) {
                    textEditingController.text = _vehicleBrandCtrl.text;
                  }

                  return TextField(
                    style: TextStyle(fontSize: 12),
                    cursorColor: AppColor.info,
                    controller: textEditingController,
                    focusNode: focusNode,

                    onChanged: (value) {
                      setState(() {
                        _vehicleBrand = value.trim();
                        _vehicleBrandCtrl.text = value;
                      });
                    },
                    decoration: _decor(
                      label: 'Hãng xe',
                      hint: 'Chọn hoặc nhập hãng xe',
                      suffixIcon: const Icon(Icons.keyboard_arrow_down_rounded),
                    ),
                  );
                },
            optionsViewBuilder: (context, onSelected, options) {
              final items = options.toList();

              if (items.isEmpty) {
                return Align(
                  alignment: Alignment.topLeft,
                  child: Material(
                    elevation: 8,
                    borderRadius: BorderRadius.circular(16),
                    color: Colors.white,
                    child: Container(
                      width: 300,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColor.border),
                      ),
                      child: const Text(
                        'Không có trong gợi ý, bạn có thể nhập hãng xe của mình.',
                        style: TextStyle(
                          color: AppColor.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              }

              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 8,
                  borderRadius: BorderRadius.circular(16),
                  color: Colors.white,
                  child: Container(
                    width: 300,
                    constraints: const BoxConstraints(maxHeight: 220),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColor.border),
                    ),
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shrinkWrap: true,
                      itemCount: items.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, color: AppColor.divider),
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return InkWell(
                          onTap: () => onSelected(item),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            child: Text(
                              item,
                              style: const TextStyle(
                                color: AppColor.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          TextField(
            cursorColor: AppColor.info,
            style: TextStyle(fontSize: 12),
            controller: _vehicleModelCtrl,
            decoration: _decor(label: 'Dòng xe'),
          ),
          const SizedBox(height: 12),
          TextField(
            cursorColor: AppColor.info,
            style: TextStyle(fontSize: 12),
            controller: _vehiclePlateCtrl,
            decoration: _decor(label: 'Biển số'),
          ),
          const SizedBox(height: 12),
          _UploadBox(
            label: 'Ảnh xe (tải từ thư viện)',
            url: _vehicleImgUrl,
            file: _vehicleFile,
            loading: false,
            onTap: () => _pickToLocal(
              pickFn: () => _pickFromGalleryAndCrop(),
              setFile: (f) => _vehicleFile = f,
            ),
          ),
        ],
      ),
    );
  }

  Widget _screenPortrait() {
    return _StepScaffold(
      title: 'Bước 5/6',
      headline: 'Ảnh chân dung',
      description:
          'Tải ảnh chân dung để cập nhật ảnh đại diện tài khoản tài xế.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _UploadBox(
            label: 'Ảnh chân dung',
            url: _avatarUrl,
            file: _avatarFile,
            loading: false,
            onTap: () => _pickToLocal(
              pickFn: () => _pickFromGalleryAndCrop(
                ratio: const CropAspectRatio(ratioX: 3, ratioY: 4),
              ),
              setFile: (f) => _avatarFile = f,
            ),
          ),
          const SizedBox(height: 12),
          const _InfoNote(
            text: 'Ảnh này sẽ được lưu vào avatar của tài khoản User.',
          ),
        ],
      ),
    );
  }

  Widget _screenSubmit() {
    return _StepScaffold(
      title: 'Bước 6/6',
      headline: 'Nộp hồ sơ',
      description:
          'Kiểm tra lại thông tin. Sau khi nộp bạn sẽ ở trạng thái chờ duyệt.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SummaryRow(label: 'SĐT', value: _phoneCtrl.text.trim()),
          _SummaryRow(label: 'CCCD', value: _idCardCtrl.text.trim()),
          _SummaryRow(label: 'GPLX', value: _licenseNoCtrl.text.trim()),
          _SummaryRow(label: 'Hạng', value: _licenseType ?? ''),
          _SummaryRow(
            label: 'Hết hạn',
            value: _licenseExpiry == null
                ? ''
                : _licenseExpiry!.toLocal().toString().split(' ').first,
          ),
          _SummaryRow(label: 'Hãng xe', value: _vehicleBrand ?? ''),
          _SummaryRow(label: 'Dòng xe', value: _vehicleModelCtrl.text.trim()),
          _SummaryRow(label: 'Biển số', value: _vehiclePlateCtrl.text.trim()),
          _SummaryRow(
            label: 'Ảnh chân dung',
            value: _hasFileOrUrl(_avatarFile, _avatarUrl) ? 'Đã có' : 'Chưa có',
          ),
          const SizedBox(height: 14),
          const _InfoNote(
            text:
                'Sau khi nộp, bạn sẽ được chuyển sang trang chờ và không thể sử dụng chức năng khác cho đến khi được duyệt.',
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(driverAuthControllerProvider);
    final me = auth.me;
    final p = me?.driverProfile;

    if (me != null && !_didPrefill) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _prefillFromMe(me);
      });
    }

    final rejectedBanner =
        (p?.verificationStatus == DriverVerificationStatus.rejected)
        ? Container(
            width: double.infinity,
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColor.danger.withOpacity(.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColor.danger.withOpacity(.18)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.error_outline_rounded, color: AppColor.danger),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Hồ sơ bị từ chối: '
                    '${(p?.verificationNote ?? '').trim().isEmpty ? (p?.verificationReasons.join(', ') ?? '') : p!.verificationNote!}',
                    style: const TextStyle(
                      color: AppColor.danger,
                      fontWeight: FontWeight.w600,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          )
        : const SizedBox.shrink();

    final progress = (_step + 1) / _totalSteps;
    final isLast = _step == _totalSteps - 1;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: AppColor.background,
        appBar: AppBar(
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: AppColor.surface,
          surfaceTintColor: AppColor.surface,
          title: const Text(
            'Onboarding tài xế',
            style: TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          automaticallyImplyLeading: false,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: TextButton(
                onPressed: _saving
                    ? null
                    : () => ref
                          .read(driverAuthControllerProvider.notifier)
                          .logout(),
                style: TextButton.styleFrom(
                  foregroundColor: AppColor.danger,
                  textStyle: const TextStyle(fontWeight: FontWeight.w700),
                ),
                child: const Text('Đăng xuất'),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            rejectedBanner,
            Container(
              color: AppColor.surface,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Text(
                        'Bước ${_step + 1}/$_totalSteps',
                        style: const TextStyle(
                          color: AppColor.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${(progress * 100).round()}%',
                        style: const TextStyle(
                          color: AppColor.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 8,
                      backgroundColor: AppColor.primaryLight,
                      valueColor: const AlwaysStoppedAnimation(
                        AppColor.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pc,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _screenPhone(),
                  _screenIdCard(),
                  _screenLicense(),
                  _screenVehicle(),
                  _screenPortrait(),
                  _screenSubmit(),
                ],
              ),
            ),
            Container(
              decoration: const BoxDecoration(
                color: AppColor.surface,
                border: Border(top: BorderSide(color: AppColor.border)),
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: (_saving || _step == 0) ? null : _back,
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            foregroundColor: AppColor.textPrimary,
                            side: const BorderSide(color: AppColor.border),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text(
                            'Quay lại',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _saving
                              ? null
                              : () {
                                  if (isLast) {
                                    _submit();
                                  } else {
                                    _next();
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            elevation: 0,
                            backgroundColor: AppColor.primary,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppColor.primary
                                .withOpacity(.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _saving
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Text(
                                  isLast ? 'Nộp hồ sơ' : 'Tiếp tục',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepScaffold extends StatelessWidget {
  const _StepScaffold({
    required this.title,
    required this.headline,
    required this.description,
    required this.child,
  });

  final String title;
  final String headline;
  final String description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColor.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColor.border),
          boxShadow: const [
            BoxShadow(
              color: Color(0x08000000),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColor.primaryLight,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                title,
                style: const TextStyle(
                  color: AppColor.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              headline,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColor.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: const TextStyle(
                color: AppColor.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),
            child,
          ],
        ),
      ),
    );
  }
}

class _InfoNote extends StatelessWidget {
  const _InfoNote({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColor.primaryLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColor.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline_rounded,
            color: AppColor.primary,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppColor.textSecondary,
                height: 1.45,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isEmpty = value.isEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColor.surfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColor.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColor.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              isEmpty ? '-' : value,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: isEmpty ? AppColor.textMuted : AppColor.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UploadBox extends StatelessWidget {
  const _UploadBox({
    required this.label,
    required this.url,
    required this.file,
    required this.loading,
    required this.onTap,
  });

  final String label;
  final String? url;
  final File? file;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasFile = file != null;
    final hasUrl = (url?.isNotEmpty ?? false);
    final done = hasFile || hasUrl;

    Widget preview;
    if (hasFile) {
      preview = Image.file(
        file!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } else if (hasUrl) {
      preview = Image.network(
        url!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } else {
      preview = Container(
        color: AppColor.surfaceWarm,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: 44,
              width: 44,
              decoration: BoxDecoration(
                color: AppColor.primaryLight,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.cloud_upload_outlined,
                color: AppColor.primary,
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColor.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        height: 150,
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(
            color: done ? AppColor.success.withOpacity(.45) : AppColor.border,
          ),
          borderRadius: BorderRadius.circular(18),
          color: AppColor.surface,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Stack(
            fit: StackFit.expand,
            children: [
              preview,
              if (done)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    height: 28,
                    width: 28,
                    decoration: BoxDecoration(
                      color: AppColor.success,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 18,
                      color: Colors.white,
                    ),
                  ),
                ),
              if (done)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 8,
                      horizontal: 12,
                    ),
                    color: Colors.black.withOpacity(.38),
                    child: const Text(
                      'Bấm để thay ảnh',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              if (loading)
                Container(
                  color: Colors.black.withOpacity(.2),
                  child: const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
