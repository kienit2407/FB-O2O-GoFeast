import 'dart:io';
import 'package:driver/features/auth/presentation/viewmodels/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:go_router/go_router.dart';

import 'package:driver/features/auth/data/models/driver_models.dart';

class DriverOnboardingPage extends ConsumerStatefulWidget {
  const DriverOnboardingPage({super.key});

  @override
  ConsumerState<DriverOnboardingPage> createState() =>
      _DriverOnboardingPageState();
}

class _DriverOnboardingPageState extends ConsumerState<DriverOnboardingPage> {
  static const int _totalSteps = 5;

  int _step = 0;
  bool _saving = false;

  late final PageController _pc;
  final ImagePicker _picker = ImagePicker();
  final _phoneCtrl = TextEditingController();
  final _idCardCtrl = TextEditingController();

  final _licenseNoCtrl = TextEditingController();
  String? _licenseType; // A1/A2/B1/B2
  DateTime? _licenseExpiry;

  String? _vehicleBrand;
  final _vehicleModelCtrl = TextEditingController();
  final _vehiclePlateCtrl = TextEditingController();

  // urls after upload
  String? _idFrontUrl;
  String? _idBackUrl;
  String? _licenseImgUrl;
  String? _vehicleImgUrl;

  File? _idFrontFile;
  File? _idBackFile;
  File? _licenseFile;
  File? _vehicleFile;
  // loading for each upload box
  bool _upIdFront = false;
  bool _upIdBack = false;
  bool _upLicense = false;
  bool _upVehicle = false;

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

    // prefill từ me nếu có
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final me = ref.read(driverAuthViewModelProvider).valueOrNull;
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
    super.dispose();
  }

  // =========================
  // Helpers UI/Flow
  // =========================

  void _gotoStep(int s) {
    final next = s.clamp(0, _totalSteps - 1);
    setState(() => _step = next);
    _pc.animateToPage(
      next,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  Future<String?> _uploadIfNeeded({
    required File? file,
    required String? existingUrl,
    required String folder,
  }) async {
    // Không chọn file mới => giữ url cũ (nếu có)
    if (file == null) return existingUrl;

    final vm = ref.read(driverAuthViewModelProvider.notifier);
    final url = await vm.uploadImage(file: file, folder: folder);
    return url;
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // =========================
  // Draft / Validate
  // =========================

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
      return (_vehicleBrand != null) &&
          _vehicleModelCtrl.text.trim().isNotEmpty &&
          _vehiclePlateCtrl.text.trim().isNotEmpty &&
          _hasFileOrUrl(_vehicleFile, _vehicleImgUrl);
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

    for (int s = 0; s <= 3; s++) {
      if (!_validateStep(s)) {
        _showSnack('Bạn đang thiếu thông tin ở bước ${s + 1}');
        _gotoStep(s);
        return;
      }
    }

    setState(() => _saving = true);
    try {
      final vm = ref.read(driverAuthViewModelProvider.notifier);

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

        // file mới (nếu user chọn)
        idCardFront: _idFrontFile,
        idCardBack: _idBackFile,
        licenseImage: _licenseFile,
        vehicleImage: _vehicleFile,

        // fallback url cũ (nếu không chọn lại)
        idCardFrontUrl: _idFrontUrl,
        idCardBackUrl: _idBackUrl,
        licenseImageUrl: _licenseImgUrl,
        vehicleImageUrl: _vehicleImgUrl,
      );

      if (!mounted) return;
      context.go('/pending');
    } catch (e) {
      _showSnack('Nộp hồ sơ thất bại: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
  // =========================
  // Pick / Crop / Upload
  // =========================

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

  /// ✅ Upload lên Cloudinary qua BE
  /// type: 'id_card_front' | 'id_card_back' | 'license' | 'vehicle'
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

      // ⚠️ yêu cầu ViewModel có hàm uploadImage(file, type)
      final url = await ref
          .read(driverAuthViewModelProvider.notifier)
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
    );
    if (picked == null) return;
    setState(() => _licenseExpiry = picked);
  }

  // =========================
  // Screens (one step per page)
  // =========================

  Widget _screenPhone() {
    return _StepScaffold(
      title: 'Bước 1/5',
      headline: 'Số điện thoại',
      description: 'Nhập số điện thoại để liên hệ và xác thực hồ sơ.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Số điện thoại',
              hintText: 'Nhập số điện thoại',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Lưu ý: Số điện thoại nằm ở User (tài khoản), không nằm ở driver_profile để tránh lệch dữ liệu.',
            style: TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _screenIdCard() {
    return _StepScaffold(
      title: 'Bước 2/5',
      headline: 'Căn cước công dân (CCCD)',
      description: 'Nhập số CCCD và chụp ảnh mặt trước/mặt sau.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _idCardCtrl,
            decoration: const InputDecoration(
              labelText: 'Số CCCD',
              hintText: 'Nhập số CCCD',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
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

          const SizedBox(height: 10),

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
      title: 'Bước 3/5',
      headline: 'Giấy phép lái xe (GPLX)',
      description: 'Nhập thông tin GPLX, ngày hết hạn và chụp ảnh GPLX.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _licenseNoCtrl,
            decoration: const InputDecoration(
              labelText: 'Số GPLX',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _licenseType,
            items: _licenseTypes
                .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                .toList(),
            onChanged: (v) => setState(() => _licenseType = v),
            decoration: const InputDecoration(
              labelText: 'Hạng GPLX',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          InkWell(
            onTap: _pickLicenseExpiry,
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Ngày hết hạn',
                border: OutlineInputBorder(),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _licenseExpiry == null
                          ? 'Chọn ngày'
                          : _licenseExpiry!
                                .toLocal()
                                .toString()
                                .split(' ')
                                .first,
                    ),
                  ),
                  const Icon(Icons.date_range),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
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
      title: 'Bước 4/5',
      headline: 'Thông tin xe',
      description: 'Chọn hãng xe, nhập dòng xe, biển số và tải ảnh xe.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            value: _vehicleBrand,
            items: _vehicleBrands
                .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                .toList(),
            onChanged: (v) => setState(() => _vehicleBrand = v),
            decoration: const InputDecoration(
              labelText: 'Hãng xe',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _vehicleModelCtrl,
            decoration: const InputDecoration(
              labelText: 'Dòng xe',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _vehiclePlateCtrl,
            decoration: const InputDecoration(
              labelText: 'Biển số',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
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

  Widget _screenSubmit() {
    return _StepScaffold(
      title: 'Bước 5/5',
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
          const SizedBox(height: 10),
          const Text(
            'Sau khi nộp, bạn sẽ được chuyển sang trang chờ và không thể sử dụng chức năng khác cho đến khi được duyệt.',
            style: TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }

  // =========================
  // Build
  // =========================

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(driverAuthViewModelProvider).valueOrNull;
    final p = me?.driverProfile;

    final rejectedBanner =
        (p?.verificationStatus == DriverVerificationStatus.rejected)
        ? Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: Colors.red.withOpacity(.08),
            child: Text(
              'Hồ sơ bị từ chối: '
              '${(p?.verificationNote ?? '').trim().isEmpty ? (p?.verificationReasons.join(', ') ?? '') : p!.verificationNote!}',
              style: const TextStyle(color: Colors.red),
            ),
          )
        : const SizedBox.shrink();

    final progress = (_step + 1) / _totalSteps;
    final isLast = _step == _totalSteps - 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Onboarding tài xế'),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: _saving
                ? null
                : () => ref.read(driverAuthViewModelProvider.notifier).logout(),
            child: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
      body: Column(
        children: [
          rejectedBanner,
          LinearProgressIndicator(value: progress),
          Expanded(
            child: PageView(
              controller: _pc,
              physics:
                  const NeverScrollableScrollPhysics(), // ✅ khóa swipe, chỉ Next/Back
              children: [
                _screenPhone(),
                _screenIdCard(),
                _screenLicense(),
                _screenVehicle(),
                _screenSubmit(),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: (_saving || _step == 0) ? null : _back,
                      child: const Text('Quay lại'),
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
                      child: _saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(isLast ? 'Nộp hồ sơ' : 'Tiếp tục'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =========================
// Widgets
// =========================

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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 6),
          Text(
            headline,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(description, style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 16),
          child,
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(color: Colors.black54)),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
              style: const TextStyle(fontWeight: FontWeight.w600),
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
      preview = Center(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Text(label, textAlign: TextAlign.center),
        ),
      );
    }

    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 120,
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(
            color: done ? Colors.green.withOpacity(.4) : Colors.black12,
          ),
          borderRadius: BorderRadius.circular(12),
          color: Colors.grey.withOpacity(.06),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            fit: StackFit.expand,
            children: [
              preview,
              if (done)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 6,
                      horizontal: 10,
                    ),
                    color: Colors.black.withOpacity(.35),
                    child: const Text(
                      'Bấm để thay ảnh',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
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
                      width: 22,
                      height: 22,
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
