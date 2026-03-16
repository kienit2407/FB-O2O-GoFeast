import 'package:customer/app/theme/app_color.dart';
import 'package:customer/core/di/providers.dart';
import 'package:customer/features/auth/domain/entities/auth_user.dart';
import 'package:customer/features/auth/presentation/viewmodels/auth_providers.dart';
import 'package:customer/features/profile/presentation/viewmodels/user_profile_controller.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_cropper/image_cropper.dart';

import 'edit_profile_text_page.dart';

class UserInfoPage extends ConsumerStatefulWidget {
  const UserInfoPage({super.key});

  @override
  ConsumerState<UserInfoPage> createState() => _UserInfoPageState();
}

class _UserInfoPageState extends ConsumerState<UserInfoPage> {
  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authViewModelProvider);
    final user = auth.valueOrNull;
    final profileState = ref.watch(userProfileControllerProvider);

    if (auth.isLoading && user == null) {
      return const Scaffold(
        backgroundColor: AppColor.background,
        body: Center(child: CircularProgressIndicator(color: AppColor.primary)),
      );
    }

    final fullName = _displayFullName(user);
    final phone = user?.phone ?? '';
    final email = user?.email ?? '';
    final avatarUrl = user?.avatarUrl;
    final username = _buildUsername(user);
    final maskedPhone = phone.trim().isEmpty ? '' : _maskPhone(phone);

    final genderLabel = switch (user?.gender) {
      'male' => 'Nam',
      'female' => 'Nữ',
      'other' => 'Khác',
      _ => 'Cập nhật ngay',
    };

    final birthDateLabel = user?.dateOfBirth == null
        ? 'Cập nhật ngay'
        : _formatDate(user!.dateOfBirth!);

    return AbsorbPointer(
      absorbing: profileState.isBusy,
      child: Scaffold(
        backgroundColor: AppColor.background,
        appBar: AppBar(
          backgroundColor: AppColor.background,
          surfaceTintColor: AppColor.background,
          elevation: 0,
          title: const Text(
            'Thông tin người dùng',
            style: TextStyle(
              color: AppColor.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 22,
            ),
          ),
          centerTitle: true,
          leading: IconButton(
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.arrow_back_rounded, color: AppColor.primary),
          ),
          bottom: profileState.isBusy
              ? const PreferredSize(
                  preferredSize: Size.fromHeight(2),
                  child: LinearProgressIndicator(minHeight: 2, backgroundColor: AppColor.primary,),
                )
              : null,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            children: [
              _CardBox(
                children: [
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => _pickCropAndUploadAvatar(),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        child: Row(
                          children: [
                            _UserAvatar(
                              avatarUrl: avatarUrl,
                              name: fullName,
                              radius: 28,
                            ),
                            const SizedBox(width: 14),
                            const Spacer(),
                            const Text(
                              'Đổi hình đại diện',
                              style: TextStyle(
                                color: AppColor.primary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.chevron_right_rounded,
                              color: AppColor.textMuted,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  _InfoTile(label: 'Tên đăng nhập', value: username),
                  _InfoTile(
                    label: 'Số điện thoại',
                    value: maskedPhone.isEmpty ? 'Cập nhật ngay' : maskedPhone,
                    onTap: () => _editPhone(phone),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _CardBox(
                children: [
                  _InfoTile(
                    label: 'Tên',
                    value: fullName.isEmpty ? 'Cập nhật ngay' : fullName,
                    onTap: () => _editFullName(fullName),
                  ),
                  _InfoTile(
                    label: 'Email',
                    value: email.isEmpty ? 'Cập nhật ngay' : email,
                  ),
                  _InfoTile(
                    label: 'Giới tính',
                    value: genderLabel,
                    onTap: () => _pickGender(user?.gender),
                  ),
                  _InfoTile(
                    label: 'Ngày sinh',
                    value: birthDateLabel,
                    onTap: () => _pickBirthDate(user?.dateOfBirth),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColor.primaryLight,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColor.border),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline_rounded, color: AppColor.primary),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Thông tin đang được lấy và cập nhật theo đúng schema backend: tên, số điện thoại, giới tính, ngày sinh và ảnh đại diện.',
                        style: TextStyle(
                          color: AppColor.textSecondary,
                          height: 1.45,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _displayFullName(AuthUser? user) {
    return user?.fullName?.trim() ?? '';
  }

  String _buildUsername(AuthUser? user) {
    final email = user?.email?.trim() ?? '';
    if (email.contains('@')) return email.split('@').first;

    final phone = user?.phone?.trim() ?? '';
    if (phone.isNotEmpty) {
      return 'user_${phone.substring(phone.length > 4 ? phone.length - 4 : 0)}';
    }

    final id = user?.id ?? '';
    if (id.isNotEmpty) {
      final short = id.length > 8 ? id.substring(0, 8) : id;
      return 'user_$short';
    }

    return 'Chưa cập nhật';
  }

  String _maskPhone(String value) {
    final digits = value.trim();
    if (digits.length < 3) return digits;
    final tail = digits.substring(digits.length - 3);
    return '*******$tail';
  }

  String _formatDate(DateTime value) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(value.day)}/${two(value.month)}/${value.year}';
  }

  Future<void> _editFullName(String currentValue) async {
    await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => EditProfileTextPage(
          title: 'Tên',
          label: 'Tên',
          initialValue: currentValue,
          onSave: (value) async {
            await ref
                .read(userProfileControllerProvider.notifier)
                .updateProfile(fullName: value);
          },
        ),
      ),
    );
  }

  Future<void> _editPhone(String currentValue) async {
    await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => EditProfileTextPage(
          title: 'Số điện thoại',
          label: 'Số điện thoại',
          hintText: 'Nhập số điện thoại',
          initialValue: currentValue,
          keyboardType: TextInputType.phone,
          onSave: (value) async {
            await ref
                .read(userProfileControllerProvider.notifier)
                .updateProfile(phone: value);
          },
        ),
      ),
    );
  }

  Future<void> _pickGender(String? currentGender) async {
    final value = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 12),
                ListTile(
                  title: const Text('Nam'),
                  trailing: currentGender == 'male'
                      ? const Icon(Icons.check, color: AppColor.primary)
                      : null,
                  onTap: () => Navigator.of(context).pop('male'),
                ),
                ListTile(
                  title: const Text('Nữ'),
                  trailing: currentGender == 'female'
                      ? const Icon(Icons.check, color: AppColor.primary)
                      : null,
                  onTap: () => Navigator.of(context).pop('female'),
                ),
                ListTile(
                  title: const Text('Khác'),
                  trailing: currentGender == 'other'
                      ? const Icon(Icons.check, color: AppColor.primary)
                      : null,
                  onTap: () => Navigator.of(context).pop('other'),
                ),
                ListTile(
                  title: const Text('Xoá giới tính'),
                  textColor: Colors.red,
                  iconColor: Colors.red,
                  onTap: () => Navigator.of(context).pop('__clear__'),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (value == null) return;

    try {
      if (value == '__clear__') {
        await ref
            .read(userProfileControllerProvider.notifier)
            .updateProfile(clearGender: true);
      } else {
        await ref
            .read(userProfileControllerProvider.notifier)
            .updateProfile(gender: value);
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Cập nhật giới tính thành công'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColor.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cập nhật thất bại: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _pickBirthDate(DateTime? currentDate) async {
    final now = DateTime.now();

    final picked = await showDatePicker(
      context: context,
      initialDate: currentDate ?? DateTime(now.year - 18, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
      
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColor
                  .primary, // displayReviews[i] Màu nền của Header và vòng tròn ngày được chọn
              onPrimary:
                  Colors.white, // displayReviews[i] Màu chữ trên Header và trên ngày được chọn
              onSurface:
                  AppColor.textPrimary, // displayReviews[i] Màu chữ của các ngày bình thường
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor:
                    AppColor.primary, // displayReviews[i] Màu chữ của 2 nút "CANCEL" và "OK"
              ),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked == null) return;

    try {
      await ref
          .read(userProfileControllerProvider.notifier)
          .updateProfile(dateOfBirth: picked);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Cập nhật ngày sinh thành công'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColor.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cập nhật thất bại: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _showAvatarActions(AuthUser? user) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 18),
                ListTile(
                  leading: const Icon(
                    Icons.image_outlined,
                    color: AppColor.primary,
                  ),
                  title: const Text('Chọn ảnh đại diện'),
                  onTap: () async {
                    Navigator.of(context).pop();
                    await _pickCropAndUploadAvatar();
                  },
                ),
                if ((user?.avatarUrl ?? '').trim().isNotEmpty)
                  ListTile(
                    leading: const Icon(
                      Icons.delete_outline,
                      color: Colors.red,
                    ),
                    title: const Text('Gỡ ảnh đại diện'),
                    onTap: () async {
                      Navigator.of(context).pop();
                      await _removeAvatar();
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickCropAndUploadAvatar() async {
    try {
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );

      final path = picked?.files.single.path;
      if (path == null || path.trim().isEmpty) return;

      final cropped = await ImageCropper().cropImage(
        sourcePath: path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 90,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Cắt ảnh đại diện',
            toolbarColor: Colors.white,
            toolbarWidgetColor: AppColor.textPrimary,
            activeControlsWidgetColor: AppColor.primary,
            lockAspectRatio: true,
            initAspectRatio: CropAspectRatioPreset.square,
          ),
          IOSUiSettings(
            title: 'Cắt ảnh đại diện',
            aspectRatioLockEnabled: true,
          ),
        ],
      );

      if (cropped == null) return;

      await ref
          .read(userProfileControllerProvider.notifier)
          .uploadAvatar(cropped.path);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Cập nhật ảnh đại diện thành công'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColor.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cập nhật ảnh thất bại: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _removeAvatar() async {
    try {
      await ref.read(userProfileControllerProvider.notifier).removeAvatar();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Đã gỡ ảnh đại diện'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColor.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gỡ ảnh thất bại: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

class _CardBox extends StatelessWidget {
  const _CardBox({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColor.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value, this.onTap});

  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final editable = onTap != null;
    final isPlaceholder = value == 'Cập nhật ngay';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: AppColor.divider)),
          ),
          child: Row(
            // Dàn đều 2 bên
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // 1. Label bên trái
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: AppColor.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(
                width: 16,
              ), // Khoảng cách an toàn giữa label và value
              // 2. Value + Icon bên phải
              Expanded(
                // Bọc inner Row trong Expanded để nó lấy phần không gian còn lại
                child: Row(
                  mainAxisAlignment:
                      MainAxisAlignment.end, // Ép nội dung sang phải
                  children: [
                    Flexible(
                      // Dùng Flexible thay cho Expanded ở đây để chữ tự thu hẹp nếu dài
                      child: Text(
                        value,
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow:
                            TextOverflow.ellipsis, // Dài quá sẽ có dấu ...
                        style: TextStyle(
                          color: isPlaceholder
                              ? AppColor.textMuted
                              : AppColor.textPrimary,
                          fontSize: 13,
                          fontWeight: isPlaceholder
                              ? FontWeight.w300
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                    if (editable) ...[
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: AppColor.textMuted,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UserAvatar extends StatelessWidget {
  const _UserAvatar({
    required this.avatarUrl,
    required this.name,
    this.radius = 26,
  });

  final String? avatarUrl;
  final String name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'U';

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColor.primaryLight,
      backgroundImage: (avatarUrl?.trim().isNotEmpty ?? false)
          ? NetworkImage(avatarUrl!)
          : null,
      child: (avatarUrl?.trim().isEmpty ?? true)
          ? Text(
              initial,
              style: const TextStyle(
                color: AppColor.primary,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            )
          : null,
    );
  }
}
